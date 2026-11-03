import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import sport_sources as sources
import y7_sport_bridge as bridge

NOW=datetime(2026,11,3,21,tzinfo=timezone.utc)

class SourceTests(unittest.TestCase):
    def test_aliases_and_time_and_age_groups(self):
        a={'title':'Барселона — Астон Вілла','kickoff':'2026-11-03T20:00:00Z'}
        b={'title':'FC Barcelona vs. Aston Villa','kickoff':'2026-11-03T20:00:00Z'}
        self.assertTrue(sources.matches(a,b))
        self.assertFalse(sources.matches(a,dict(b,kickoff='2026-11-04T20:00:00Z')))
        self.assertFalse(sources.matches(a,{'title':'Barcelona U19 vs Aston Villa U19','kickoff':b['kickoff']}))
        self.assertTrue(sources.matches({'title':'Feyenoord — Inter'},{'title':'Feyenoord Rotterdam vs Internazionale'}))
        self.assertFalse(sources.matches(dict(a,sport='football'),dict(b,sport='basketball')))
    def test_p2p_exact_event_and_dedupe(self):
        ident='a'*40
        html=f'<a href="acestream://{ident}">x</a><a href="/webplayer2.php?t=acestream&amp;c={ident}&amp;eid=5">same</a><a href="/webplayer2.php?t=acestream&amp;c={"b"*40}&amp;eid=6">wrong</a><a href="acestream://invalid">bad</a>'
        got=sources.p2p_links(html,'5');self.assertEqual(len(got),1);self.assertEqual(got[0]['id'],ident);self.assertNotIn('url',got[0])
    def test_daddy_context_flags_and_sports(self):
        html='''<div class="schedule__dayTitle">Tuesday 03rd Nov 2026 - Schedule Time UK GMT</div>
        <div class="schedule__event"><span class="schedule__time">20:00</span><span class="schedule__eventTitle">⚽ UEFA Champions League : Barcelona 🇪🇸 vs Aston Villa</span><img src="icon"><div><a href="/watch.php?id=2" title="One">1</a></div></div>
        <div class="schedule__event"><span class="schedule__time">20:00</span><span class="schedule__eventTitle">🏀 Basketball : Juventus vs Pardubice</span><a href="/watch.php?id=3">2</a></div>'''
        events,_=sources.parse_daddy(html,NOW)
        self.assertEqual(len(events),2);self.assertEqual(events[0]['home_key'],'barcelona')
        self.assertEqual([x['id'] for x in events[0]['sources']],['2']);self.assertEqual(events[1]['sport'],'basketball')
        self.assertEqual(events[0]['kickoff'],'2026-11-03T20:00:00Z')
    def test_ppv_channels_expiration_and_no_private_url(self):
        item={'id':1,'name':'Barcelona vs Aston Villa','starts_at':int((NOW-timedelta(hours=1)).timestamp()),'ends_at':int((NOW+timedelta(hours=1)).timestamp()),'iframe':'https://example.com/embed/1'}
        doc={'success':True,'streams':[{'category':'Football','streams':[item,dict(item,id=2,ends_at=int((NOW-timedelta(hours=1)).timestamp())),dict(item,id=3,always_live=1),dict(item,id=4,iframe='https://example.com/?token=private')]}]}
        events,channels=sources.parse_ppv(doc,NOW)
        self.assertEqual(len(events),1);self.assertEqual(events[0]['status'],'live');self.assertEqual(len(channels),1)
        self.assertNotIn('iframe',json.dumps(events+channels));self.assertNotIn('private',json.dumps(events+channels))
    def test_pit_announced_video_separate(self):
        item={'programId':1,'titleText':'Barcelona vs Aston Villa','footer':'UEFA Champions League','sessionStart':int(NOW.timestamp()),'hasVideo':True}
        events,_=sources.parse_pit({'ok':True,'data':{'live':[item],'upcoming':[dict(item,programId=2,hasVideo=False)]}},NOW)
        self.assertEqual(len(events[0]['sources']),1);self.assertEqual(events[1]['sources'],[])
    def test_tim_empty_and_vip(self):
        self.assertEqual(sources.parse_tim({'events':None},NOW),([],[]))
        self.assertEqual(sources.parse_tim({'events':[{'id':'vip','name':'x','time':NOW.isoformat(),'vip':True}]},NOW),([],[]))
    def test_daddy_rejects_non_sport_and_contradictory_title_dates(self):
        start='<div class="schedule__dayTitle">Tuesday 03rd Nov 2026</div>'
        for title in ('📺 General Hospital','🥊 Fight live on Friday, December 11, 2026','🏎 Formula 1 | 1 November 2026'):
            html=start+'<div class="schedule__event"><span class="schedule__time">20:00</span><span class="schedule__eventTitle">'+title+'</span><a href="/watch.php?id=1">x</a></div>'
            self.assertEqual(sources.parse_daddy(html,NOW),([],[]))

class FakeEngine(BaseHTTPRequestHandler):
    stopped=[]
    def log_message(self,*args):pass
    def do_GET(self):
        base='http://127.0.0.1:'+str(self.server.server_port)
        if self.path.startswith('/ace/manifest.m3u8?'):
            data=json.dumps({'response':{'playback_url':base+'/ace/live/master.m3u8?private=secret','command_url':base+'/ace/cmd/ab/cd'}}).encode();mime='application/json'
        elif self.path.startswith('/ace/cmd/ab/cd'):
            self.stopped.append(self.path);data=b'{}';mime='application/json'
        elif 'master.m3u8' in self.path:data=b'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nvariant.m3u8?private=secret\n';mime='application/vnd.apple.mpegurl'
        elif 'variant.m3u8' in self.path:data=b'#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nsegment.ts?private=secret\n';mime='application/vnd.apple.mpegurl'
        elif '/segment.ts' in self.path:data=(b'\x47'+bytes(187))*3;mime='video/mp2t'
        else:self.send_error(404);return
        self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(data)

class BridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine=ThreadingHTTPServer(('127.0.0.1',0),FakeEngine)
        cls.thread=threading.Thread(target=cls.engine.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):cls.engine.shutdown();cls.engine.server_close();cls.thread.join()
    def setUp(self):
        self.core=bridge.Bridge({'access_key':'test-only-'+'x'*40,'engine_url':'http://127.0.0.1:'+str(self.engine.server_port)})
    def tearDown(self):
        for sid in list(self.core.sessions):self.core.stop(sid)
    def test_engine_manifest_segment_and_stop(self):
        sid,item=self.core.prepare({'kind':'acestream','id':'a'*40},'tv')
        self.assertEqual(item['kind'],'hls');master=self.core.media(sid,'index.m3u8','tv')['body'].decode()
        self.assertNotIn('secret',master);self.assertNotIn('127.0.0.1',master)
        variant=self.core.media(sid,master.splitlines()[-1],'tv')['body'].decode()
        segment=self.core.media(sid,variant.splitlines()[-1],'tv')['body'];self.assertEqual(segment[0],0x47)
        self.core.stop(sid);self.assertEqual(FakeEngine.stopped[-1],'/ace/cmd/ab/cd?method=stop')
        with self.assertRaisesRegex(bridge.BridgeError,'SESSION_EXPIRED'):self.core.media(sid,'index.m3u8','tv')
    def test_expiry_and_ip_bound_capability(self):
        sid,item=self.core.prepare({'kind':'acestream','id':'a'*40},'tv')
        with self.assertRaisesRegex(bridge.BridgeError,'SESSION_EXPIRED'):self.core.media(sid,'index.m3u8','other')
        item['touched']-=181;self.core.cleanup();self.assertNotIn(sid,self.core.sessions)
    def test_failed_prepare_stops_engine(self):
        with patch.object(self.core,'probe_hls',side_effect=bridge.BridgeError('INVALID_MEDIA')):
            before=len(FakeEngine.stopped)
            with self.assertRaisesRegex(bridge.BridgeError,'INVALID_MEDIA'):self.core.prepare({'kind':'acestream','id':'b'*40},'tv')
            self.assertEqual(len(FakeEngine.stopped),before+1)
        self.assertEqual(self.core.sessions,{})
    def test_drm_html_ad_and_arbitrary_url_rejected(self):
        with self.assertRaisesRegex(bridge.BridgeError,'PROTECTED_MEDIA'):bridge.check_hls(b'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"')
        with self.assertRaisesRegex(bridge.BridgeError,'INVALID_MEDIA'):bridge.check_hls(b'<html><video>')
        self.assertEqual(bridge.media_candidates('<iframe src="https://ads.example/video.m3u8"></iframe>','https://example.com'),[])
        self.assertEqual(bridge.media_candidates('file:"https://ads.example/video.m3u8"','https://example.com'),[])
        with self.assertRaisesRegex(bridge.BridgeError,'UNSUPPORTED_SOURCE'):self.core.resolver.resolve({'kind':'url','url':'https://example.com/video.m3u8'})
    def test_public_dns_private_addresses_and_redirect_guard(self):
        with patch.object(bridge.socket,'getaddrinfo',return_value=[(0,0,0,'',('127.0.0.1',443))]):
            with self.assertRaisesRegex(bridge.BridgeError,'NON_PUBLIC_SOURCE'):bridge.Network().get('https://public.example/file.m3u8')
        with self.assertRaisesRegex(bridge.BridgeError,'UNSAFE_ENGINE_RESPONSE'):self.core.net.get('http://127.0.0.1:9118/version',engine=True)
    def test_livetv_frame_exact_event_channel(self):
        s={'event_id':'123','id':'45','channel':'xyz','type':'alieztv'}
        self.assertIn('eid=123',bridge.livetv_source_url(s))
        self.assertEqual(bridge.choose_livetv_frame(['https://emb.apl644.online/player/live.php?id=other'],s,'https://livetv.sx'), '')
        self.assertTrue(bridge.choose_livetv_frame(['https://emb.apl644.online/player/live.php?id=xyz'],s,'https://livetv.sx'))
    def test_pit_public_player_api_returns_only_media_in_memory(self):
        ident='01a1a267-3017-73d9-96b6-1fd637852ff5'
        with patch.object(self.core.net,'json',return_value={'ok':True,'data':{'video':{'allowed':True,'embedUrl':'https://embdlol.st/embed/'+ident}}}),patch.object(self.core.net,'watch',return_value={'url':'https://media.example/live.m3u8?token=test-only','hmk-token':'discarded'}) as watch:
            value=self.core.resolver.resolve({'provider':'pit','kind':'provider','id':'123'})
            watch.assert_called_once_with(ident);self.assertEqual(value['url'],'https://media.example/live.m3u8?token=test-only');self.assertNotIn('hmk-token',value)
        with self.assertRaisesRegex(bridge.BridgeError,'INVALID_SOURCE'):self.core.net.watch('../other')
    def test_http_auth_and_native_capability(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),bridge.handler_for(self.core));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base='http://127.0.0.1:'+str(server.server_port)
        try:
            with self.assertRaises(HTTPError) as caught:urlopen(Request(base+'/api/resolve',data=b'{}',method='POST'))
            self.assertEqual(caught.exception.code,401)
            req=Request(base+'/api/resolve',data=json.dumps({'source':{'kind':'acestream','id':'a'*40}}).encode(),headers={'Authorization':'Bearer '+self.core.config['access_key'],'Content-Type':'application/json'})
            answer=json.load(urlopen(req));self.assertTrue(answer['transport_checked']);self.assertFalse(answer['lg_tested'])
            manifest=urlopen(base+answer['path']).read();self.assertIn(b'#EXTM3U',manifest);self.assertNotIn(b'secret',manifest)
        finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
