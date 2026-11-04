import copy
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import threading
import unittest
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
sys.path.insert(0,str(ROOT/'scripts'))
import tailscale_config as topology
import y7_sport_bridge as bridge
from test_sources_bridge import FakeEngine

HOST='example.test-tailnet.ts.net'
def configuration():
    return {'TCP':{'443':{'HTTPS':True},'8443':{'HTTPS':True}},
            'Web':{HOST+':443':{'Handlers':{'/':{'Proxy':'http://127.0.0.1:9120'},'/existing/':{'Proxy':'http://127.0.0.1:9999'}}},
                   HOST+':8443':{'Handlers':{'/':{'Proxy':'http://127.0.0.1:9132'}}}},
            'AllowFunnel':{HOST+':443':True},'ExtraFutureSetting':{'must':'remain unchanged'}}

def activated(before):
    after=copy.deepcopy(before);after['Web'][HOST+':443']['Handlers'][topology.MOUNT]={'Proxy':topology.TARGET};return after

class TopologyTests(unittest.TestCase):
    def test_add_one_mount_preserves_entire_existing_config(self):
        before=configuration();answer=topology.verify(before,activated(before))
        self.assertTrue(answer['preserved']);self.assertEqual(answer['public_url'],'https://'+HOST+'/sport-bridge')
        self.assertNotIn(topology.MOUNT,before['Web'][HOST+':443']['Handlers'])
    def test_root_and_private_port_and_unknown_settings_are_protected(self):
        for change in ('root','private_proxy','private_funnel','other_mount','unknown'):
            before=configuration();after=activated(before)
            if change=='root':after['Web'][HOST+':443']['Handlers']['/']['Proxy']='http://127.0.0.1:9122'
            if change=='private_proxy':after['Web'][HOST+':8443']['Handlers']['/']['Proxy']='http://127.0.0.1:9122'
            if change=='private_funnel':after['AllowFunnel'][HOST+':8443']=True
            if change=='other_mount':after['Web'][HOST+':8443']['Handlers'][topology.MOUNT]={'Proxy':topology.TARGET}
            if change=='unknown':after['ExtraFutureSetting']['must']='changed'
            with self.subTest(change=change),self.assertRaises(ValueError):topology.verify(before,after)
    def test_wrong_topology_and_route_conflicts_rejected(self):
        before=configuration();before['AllowFunnel']={}
        with self.assertRaises(ValueError):topology.inspect(before)
        before=activated(configuration());before['Web'][HOST+':443']['Handlers'][topology.MOUNT]={'Proxy':'http://127.0.0.1:7777'}
        with self.assertRaises(ValueError):topology.inspect(before)
        before=configuration();before['Web'][HOST+':443']['Handlers']['/sport-bridge/other']={'Proxy':'http://127.0.0.1:7777'}
        with self.assertRaises(ValueError):topology.inspect(before)
    def test_idempotent_and_scoped_rollback(self):
        before=configuration();after=activated(before)
        self.assertTrue(topology.verify(after,copy.deepcopy(after))['preserved'])
        self.assertFalse(topology.verify(before,before,removed=True)['mount_present'])
        with self.assertRaises(ValueError):topology.verify(before,after,removed=True)
        with self.assertRaises(ValueError):topology.verify(before,before)

class PrefixProxyTests(unittest.TestCase):
    def test_auth_cors_and_hls_survive_tailscale_style_mount(self):
        engine=ThreadingHTTPServer(('127.0.0.1',0),FakeEngine)
        core=bridge.Bridge({'access_key':'test-only-'+'x'*40,'engine_url':'http://127.0.0.1:'+str(engine.server_port)})
        backend=ThreadingHTTPServer(('127.0.0.1',0),bridge.handler_for(core))
        class Proxy(BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def forward(self):
                if not self.path.startswith('/sport-bridge/'):
                    self.send_response(200);self.end_headers();self.wfile.write(b'Existing Gateway');return
                conn=http.client.HTTPConnection('127.0.0.1',backend.server_port,timeout=5)
                body=self.rfile.read(int(self.headers.get('Content-Length','0')))
                headers={k:v for k,v in self.headers.items() if k.lower() not in ('host','connection','content-length')}
                headers['X-Forwarded-Proto']='https';headers['Tailscale-Funnel-Request']='?1'
                try:
                    conn.request(self.command,self.path[len('/sport-bridge'):],body=body or None,headers=headers);res=conn.getresponse();data=res.read()
                    self.send_response(res.status)
                    for k,v in res.getheaders():
                        if k.lower() not in ('transfer-encoding','connection','server','date','content-length'):self.send_header(k,v)
                    self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
                finally:conn.close()
            do_GET=forward;do_POST=forward;do_OPTIONS=forward
        proxy=ThreadingHTTPServer(('127.0.0.1',0),Proxy);servers=[engine,backend,proxy]
        threads=[threading.Thread(target=s.serve_forever,daemon=True) for s in servers]
        for t in threads:t.start()
        base='http://127.0.0.1:'+str(proxy.server_port)+'/sport-bridge'
        try:
            self.assertEqual(urlopen(base.rsplit('/',1)[0]+'/').read(),b'Existing Gateway')
            self.assertTrue(json.load(urlopen(base+'/health'))['ok'])
            with self.assertRaises(HTTPError) as denied:urlopen(Request(base+'/api/check',data=b'{}',method='POST'))
            self.assertEqual(denied.exception.code,401)
            preflight=urlopen(Request(base+'/api/resolve',method='OPTIONS'))
            self.assertIn('Authorization',preflight.headers['Access-Control-Allow-Headers'])
            req=Request(base+'/api/resolve',data=json.dumps({'source':{'kind':'acestream','id':'a'*40}}).encode(),headers={'Authorization':'Bearer '+core.config['access_key'],'Content-Type':'application/json'})
            result=json.load(urlopen(req));url=base+result['path']
            for _ in range(2):
                manifest=urlopen(url).read().decode();self.assertIn('#EXTM3U',manifest);self.assertNotIn('secret',manifest)
                url=urljoin(url,[line for line in manifest.splitlines() if line and not line.startswith('#')][-1])
                self.assertIn('/sport-bridge/media/',url)
            self.assertEqual(urlopen(url).read()[0],0x47)
            stop=Request(base+'/api/stop',data=json.dumps({'session_id':result['session_id']}).encode(),headers={'Authorization':'Bearer '+core.config['access_key'],'Content-Type':'application/json'})
            self.assertTrue(json.load(urlopen(stop))['ok']);self.assertEqual(core.sessions,{})
        finally:
            for sid in list(core.sessions):core.stop(sid)
            for s in servers:s.shutdown();s.server_close()
            for t in threads:t.join()

if __name__=='__main__':unittest.main()
