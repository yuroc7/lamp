"""Private on-demand media bridge for Y7 Sport.

Run on the actual media server, not the GitHub runner. Nothing in this module
installs software, changes Gateway/Tailscale, or grants broadcast rights.
Provider pages are parsed as data. Their scripts, ads and iframe UI never reach
Lampa's native media player. Protected/VIP APIs and DRM are not bypassed.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
import hashlib
import hmac
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import json
from pathlib import Path
import re
import secrets
import socket
import ssl
import threading
import time
from urllib.parse import urljoin, urlsplit, urlunsplit, urlencode, parse_qs

VERSION='1.1.8'
MAX_BODY=32*1024*1024
HLS_MIME={'application/x-mpegurl','application/vnd.apple.mpegurl','audio/mpegurl'}

class BridgeError(Exception):
    def __init__(self,code):self.code=code;super().__init__(code)

def origin(url):
    p=urlsplit(url)
    return (p.scheme,p.hostname,p.port or (443 if p.scheme=='https' else 80))

class Network:
    def __init__(self,engine='http://127.0.0.1:6878'):
        self.engine=engine.rstrip('/')
        p=urlsplit(self.engine)
        if p.scheme not in ('http','https') or not p.hostname or p.username or p.password or p.path not in ('','/') or p.query:
            raise BridgeError('BAD_ENGINE_ADDRESS')
    def get(self,url,limit=1048576,engine=False,range_header=None,payload=None):
        """Bound DNS and redirects. Never forward a browser's cookies/headers.

        The one explicitly configured engine origin may be private. Everything
        derived from third-party metadata must resolve exclusively to global IPs.
        """
        for _ in range(4):
            p=urlsplit(url)
            if p.username or p.password or p.fragment or not p.hostname or len(url)>6000:raise BridgeError('UNSAFE_SOURCE')
            if engine:
                if origin(url)!=origin(self.engine) or not p.path.startswith('/ace/'):raise BridgeError('UNSAFE_ENGINE_RESPONSE')
            elif p.scheme!='https' or p.port not in (None,443):raise BridgeError('UNSAFE_SOURCE')
            ips=list(dict.fromkeys(row[4][0] for row in socket.getaddrinfo(p.hostname,p.port or (443 if p.scheme=='https' else 80),type=socket.SOCK_STREAM)))
            if not ips or (not engine and any(not ipaddress.ip_address(ip).is_global for ip in ips)):raise BridgeError('NON_PUBLIC_SOURCE')
            cls=http.client.HTTPSConnection if p.scheme=='https' else http.client.HTTPConnection
            kwargs={'timeout':12}
            if p.scheme=='https':kwargs['context']=ssl.create_default_context()
            conn=cls(p.hostname,p.port or (443 if p.scheme=='https' else 80),**kwargs)
            pin=ips[0]
            conn._create_connection=lambda address,timeout=12,source_address=None:socket.create_connection((pin,address[1]),timeout,source_address)
            headers={'User-Agent':'Y7Sport/1.1.8','Accept':'*/*'}
            if payload is not None:
                if url!='https://api.embdlol.st/watch':raise BridgeError('UNSAFE_SOURCE')
                headers['Content-Type']='application/json'
            if range_header:
                if not re.fullmatch(r'bytes=\d*-\d*',range_header):raise BridgeError('BAD_RANGE')
                headers['Range']=range_header
            try:
                path=p.path or '/'
                if p.query:path+='?'+p.query
                conn.request('POST' if payload is not None else 'GET',path,body=payload,headers=headers);res=conn.getresponse()
                if res.status in (301,302,303,307,308):
                    if payload is not None:raise BridgeError('UNSAFE_SOURCE')
                    url=urljoin(url,res.getheader('Location') or '');continue
                if res.status not in (200,206):raise BridgeError('UPSTREAM_UNAVAILABLE')
                data=res.read(limit+1)
                if len(data)>limit:raise BridgeError('SOURCE_TOO_LARGE')
                return {'url':url,'body':data,'mime':(res.getheader('Content-Type') or '').split(';')[0].lower(),
                        'status':res.status,'range':res.getheader('Content-Range')}
            finally:conn.close()
        raise BridgeError('TOO_MANY_REDIRECTS')
    def json(self,url,engine=False):
        return json.loads(self.get(url,6_000_000,engine)['body'])
    def watch(self,ident):
        if not re.fullmatch(r'[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}',ident):raise BridgeError('INVALID_SOURCE')
        return json.loads(self.get('https://api.embdlol.st/watch',payload=json.dumps({'watchId':ident}).encode())['body'])
    def engine_info(self):
        # Health is intentionally a fixed configured endpoint, not a URL supplied
        # by the client or third-party metadata.
        p=urlsplit(self.engine);conn=(http.client.HTTPSConnection if p.scheme=='https' else http.client.HTTPConnection)(p.hostname,p.port or (443 if p.scheme=='https' else 80),timeout=3)
        try:
            conn.request('GET','/webui/api/service?method=get_version');res=conn.getresponse()
            if res.status!=200:raise BridgeError('ENGINE_UNAVAILABLE')
            obj=json.loads(res.read(8192));value=obj.get('result') or {}
            if obj.get('error') or not isinstance(value,dict) or not value.get('version'):raise BridgeError('ENGINE_UNAVAILABLE')
            return {'available':True,'version':str(value.get('version') or '')[:40]}
        finally:conn.close()

class PageMedia(HTMLParser):
    def __init__(self):super().__init__();self.media=[];self.frames=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('video','source') and a.get('src'):self.media.append(a['src'])
        if tag=='iframe' and a.get('src'):self.frames.append(a['src'].strip())

def media_candidates(text,base):
    """Explicit video config only; no unpacking/eval or broad URL harvesting."""
    parser=PageMedia();parser.feed(text);raw=list(parser.media)
    for match in re.finditer(r'''(?i)(?:\bsource|\bfile|\bsrc)\s*:\s*(["'])(https?[^"'<>\s]{1,5000}\.(?:m3u8|mp4)(?:\?[^"'<>\s]{0,3000})?)\1''',text):raw.append(match.group(2))
    result=[]
    for value in raw:
        value=urljoin(base,unescape(value.replace('\\/','/')));p=urlsplit(value)
        if p.scheme!='https' or not p.hostname or p.username or p.password:continue
        if re.search(r'(?i)(?:^|[./_-])(?:ads?|advert|tracking|vast)(?:[./_-]|$)',p.hostname+p.path):continue
        if re.search(r'\.(?:m3u8|mp4)$',p.path,re.I) and value not in result:result.append(value)
    return result

def livetv_source_url(source):
    eid=str(source.get('event_id') or '');lid=str(source.get('id') or '');channel=str(source.get('channel') or '');kind=source.get('type')
    if not re.fullmatch(r'\d{1,14}',eid) or not re.fullmatch(r'\d{1,14}',lid) or not re.fullmatch(r'[A-Za-z0-9_-]{1,160}',channel):raise BridgeError('INVALID_SOURCE')
    if kind not in ('alieztv','tvope','youtube','html5'):raise BridgeError('UNSUPPORTED_SOURCE')
    return 'https://livetv.sx/webplayer2.php?'+urlencode({'t':kind,'c':channel,'lang':'ua','eid':eid,'lid':lid})

def choose_livetv_frame(frames,source,base):
    expected={'alieztv':('emb.apl644.online','/player/live.php'),'tvope':('emb.tvp9.online','/p2p/')}.get(source.get('type'))
    if not expected:return ''
    for frame in frames:
        url=urljoin(base,frame);p=urlsplit(url);q=parse_qs(p.query)
        if p.scheme=='https' and (p.hostname,p.path)==expected and q.get('id')==[str(source.get('channel'))]:return url
    return ''

class Resolver:
    def __init__(self,network):self.net=network
    def resolve(self,source):
        kind=source.get('kind');provider=source.get('provider')
        if kind=='sopcast':raise BridgeError('SOPCAST_UNSUPPORTED')
        if kind=='acestream':
            ident=str(source.get('id') or '')
            if not re.fullmatch(r'[a-fA-F0-9]{40}',ident):raise BridgeError('INVALID_ACESTREAM_ID')
            params=urlencode({'content_id':ident.lower(),'format':'json','use_api_stop':'1','transcode_audio':'1'})
            try:doc=self.net.json(self.net.engine+'/ace/manifest.m3u8?'+params,True)
            except Exception:raise BridgeError('ENGINE_UNAVAILABLE')
            response=doc.get('response') or {}
            if doc.get('error') or not isinstance(response,dict):raise BridgeError('ENGINE_FAILED')
            playback=response.get('playback_url');command=response.get('command_url') or ''
            if not playback or origin(playback)!=origin(self.net.engine) or not urlsplit(playback).path.startswith('/ace/'):raise BridgeError('UNSAFE_ENGINE_RESPONSE')
            if command and (origin(command)!=origin(self.net.engine) or not re.fullmatch(r'/ace/cmd/[a-fA-F0-9]+/[a-fA-F0-9]+',urlsplit(command).path)):raise BridgeError('UNSAFE_ENGINE_RESPONSE')
            if response.get('is_encrypted'):
                if command:
                    try:self.net.get(command+'?method=stop',engine=True)
                    except Exception:pass
                raise BridgeError('PROTECTED_MEDIA')
            return {'url':playback,'engine':True,'stop':command}
        if kind!='provider':raise BridgeError('UNSUPPORTED_SOURCE')
        ident=str(source.get('id') or '')
        if provider=='livetv':url=livetv_source_url(source)
        elif provider=='daddy' and re.fullmatch(r'\d{1,12}',ident):url='https://thedaddy.pk/stream/stream-'+ident+'.php'
        elif provider=='ppv' and re.fullmatch(r'\d{1,12}',ident):
            doc=self.net.json('https://api.ppv.st/api/streams');items=[x for cat in doc.get('streams',[]) for x in cat.get('streams',[])]
            found=next((x for x in items if str(x.get('id'))==ident),None)
            if not found:raise BridgeError('SOURCE_EXPIRED')
            url=found.get('iframe')
        elif provider=='pit' and re.fullmatch(r'\d{1,12}',ident):
            doc=self.net.json('https://pitsport.st/api/v1/programs/'+ident+'/play')
            video=(doc.get('data') or {}).get('video') or {}
            if not doc.get('ok') or video.get('allowed') is not True:raise BridgeError('PROTECTED_SOURCE')
            url=video.get('embedUrl')
            p=urlsplit(url or '')
            if p.scheme=='https' and p.hostname=='embdlol.st' and p.path.startswith('/embed/') and not p.query:
                # This is the public player's normal documented-in-code request,
                # not a protected endpoint or an evaluated/decoded player script.
                playback=self.net.watch(p.path.rsplit('/',1)[-1]);media=playback.get('url') or ''
                if re.search(r'\.m3u8(?:\?|$)',media):return {'url':media,'engine':False,'stop':''}
                raise BridgeError('NO_NATIVE_MEDIA')
        elif provider=='tim' and re.fullmatch(r'[A-Za-z0-9_-]{1,180}',ident):
            obj=self.net.json('https://tim-streams.com/api/watch/'+ident).get('item') or {}
            if obj.get('vip'):raise BridgeError('PROTECTED_SOURCE')
            urls=[]
            for item in obj.get('streams',[]):
                candidate=item.get('url') or item.get('src') or ''
                if re.search(r'\.(?:m3u8|mp4)(?:\?|$)',candidate):urls.append(candidate)
            if len(urls)==1:return {'url':urls[0],'engine':False,'stop':''}
            raise BridgeError('NO_NATIVE_MEDIA')
        else:raise BridgeError('UNSUPPORTED_SOURCE')
        if not url or urlsplit(url).scheme!='https':raise BridgeError('UNSAFE_SOURCE')
        response=self.net.get(url);text=response['body'].decode('utf-8','replace');base=response['url']
        media=media_candidates(text,base)
        if not media and provider=='livetv':
            page=PageMedia();page.feed(text);frame=choose_livetv_frame(page.frames,source,base)
            if frame:
                child=self.net.get(frame);media=media_candidates(child['body'].decode('utf-8','replace'),child['url'])
        if len(media)!=1:raise BridgeError('NO_NATIVE_MEDIA')
        return {'url':media[0],'engine':False,'stop':''}

def check_hls(body):
    try:text=body.decode('utf-8-sig')
    except UnicodeError:raise BridgeError('INVALID_MEDIA')
    if not text.lstrip().startswith('#EXTM3U'):raise BridgeError('INVALID_MEDIA')
    if re.search(r'#EXT-X-(?:SESSION-)?KEY:(?!METHOD=NONE(?:,|\s|$))',text):raise BridgeError('PROTECTED_MEDIA')
    return text

class Bridge:
    def __init__(self,config,network=None):
        self.config=config;self.net=network or Network(config.get('engine_url','http://127.0.0.1:6878'))
        self.resolver=Resolver(self.net);self.sessions={};self.lock=threading.RLock();self.slots=threading.BoundedSemaphore(3)
        if len(str(config.get('access_key','')))<32:raise BridgeError('ACCESS_KEY_REQUIRED')
    def stop(self,sid):
        with self.lock:session=self.sessions.pop(sid,None)
        if session and session.get('stop'):
            try:self.net.get(session['stop']+'?method=stop',engine=True)
            except Exception:pass
    def cleanup(self):
        with self.lock:expired=[sid for sid,item in self.sessions.items() if time.time()-item['touched']>180 or time.time()-item['created']>4*3600]
        for sid in expired:self.stop(sid)
    def prepare(self,source,client):
        if not self.slots.acquire(blocking=False):raise BridgeError('BUSY')
        try:return self._prepare(source,client)
        finally:self.slots.release()
    def _prepare(self,source,client):
        self.cleanup()
        with self.lock:
            if sum(item['client']==client for item in self.sessions.values())>=3:raise BridgeError('TOO_MANY_SESSIONS')
        resolved=self.resolver.resolve(source)
        try:
            response=None
            for attempt in range(12 if resolved['engine'] else 1):
                try:response=self.net.get(resolved['url'],engine=resolved['engine']);break
                except Exception:
                    if attempt==11 or not resolved['engine']:raise
                    time.sleep(2)
            body=response['body'];mime=response['mime']
            if mime in HLS_MIME:
                check_hls(body);kind='hls';self.probe_hls(response,resolved['engine'])
            # Large MP4 files need a streaming Range proxy. This bridge only
            # advertises the bounded, validated HLS transport it implements.
            else:raise BridgeError('NO_NATIVE_MEDIA')
        except Exception:
            if resolved.get('stop'):
                try:self.net.get(resolved['stop']+'?method=stop',engine=True)
                except Exception:pass
            raise
        sid=secrets.token_urlsafe(24);now=time.time()
        session=dict(resolved,client=client,created=now,touched=now,routes={'index.m3u8' if kind=='hls' else 'video.mp4':response['url']},kind=kind)
        with self.lock:self.sessions[sid]=session
        return sid,session
    def probe_hls(self,response,engine):
        for _ in range(4):
            text=check_hls(response['body']);lines=[line.strip() for line in text.splitlines()]
            if '#EXT-X-STREAM-INF:' in text:
                candidates=[line for line in lines if line and not line.startswith('#')]
                if not candidates:raise BridgeError('EMPTY_MEDIA')
                response=self.net.get(urljoin(response['url'],candidates[0]),engine=engine);continue
            segments=[line for line in lines if line and not line.startswith('#')]
            if not segments:raise BridgeError('EMPTY_MEDIA')
            chunk=self.net.get(urljoin(response['url'],segments[-1]),MAX_BODY,engine,range_header='bytes=0-65535')
            data=chunk['body']
            ts=len(data)>188 and any(data[i]==0x47 and data[i+188]==0x47 for i in range(min(188,len(data)-188)))
            mp4=any(marker in data[:256] for marker in (b'ftyp',b'styp',b'moof',b'sidx'))
            if chunk['mime'].startswith(('text/','application/json')) or not (ts or mp4):raise BridgeError('INVALID_MEDIA')
            return
        raise BridgeError('MEDIA_NESTING_LIMIT')
    def media(self,sid,route,client,range_header=None):
        self.cleanup()
        with self.lock:
            item=self.sessions.get(sid)
            if not item or item['client']!=client:raise BridgeError('SESSION_EXPIRED')
            url=item['routes'].get(route)
            if not url:raise BridgeError('UNKNOWN_MEDIA')
            item['touched']=time.time()
        response=self.net.get(url,MAX_BODY,item['engine'],range_header)
        if response['mime'] in HLS_MIME:
            text=check_hls(response['body']);base=response['url']
            def register(value):
                absolute=urljoin(base,value)
                p=urlsplit(absolute)
                if item['engine']:
                    if origin(absolute)!=origin(self.net.engine) or not p.path.startswith('/ace/'):raise BridgeError('UNSAFE_ENGINE_RESPONSE')
                elif p.scheme!='https' or p.username or p.password:raise BridgeError('UNSAFE_SOURCE')
                key=hashlib.sha256(absolute.encode()).hexdigest()[:24]
                with self.lock:
                    if len(item['routes'])>=12000 and key not in item['routes']:raise BridgeError('MEDIA_ROUTE_LIMIT')
                    item['routes'][key]=absolute
                # Relative references also work behind an operator-configured
                # HTTPS reverse proxy mounted at a path prefix.
                return key
            output=[]
            for line in text.splitlines():
                if line and not line.startswith('#'):line=register(line.strip())
                elif 'URI="' in line:line=re.sub(r'URI="([^"]+)"',lambda m:'URI="'+register(m.group(1))+'"',line)
                output.append(line)
            response.update(body=('\n'.join(output)+'\n').encode(),mime='application/vnd.apple.mpegurl',range=None,status=200)
        elif response['mime'].startswith(('text/html','application/json')):raise BridgeError('INVALID_MEDIA')
        return response

def handler_for(bridge):
    class Handler(BaseHTTPRequestHandler):
        server_version='Y7SportBridge/'+VERSION
        def log_message(self,*args):pass  # No capability paths, upstream URLs or keys in logs.
        def headers_common(self):
            self.send_header('Access-Control-Allow-Origin','*')
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
        def json_reply(self,status,obj):
            body=json.dumps(obj,ensure_ascii=False).encode();self.send_response(status);self.headers_common()
            self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        def do_OPTIONS(self):self.send_response(204);self.headers_common();self.end_headers()
        def do_GET(self):
            path=urlsplit(self.path).path
            if path=='/health':return self.json_reply(200,{'ok':True,'version':VERSION})
            match=re.fullmatch(r'/media/([A-Za-z0-9_-]{32})/([A-Za-z0-9_.-]{1,40})',path)
            if not match:return self.json_reply(404,{'error':'NOT_FOUND'})
            try:
                response=bridge.media(match[1],match[2],self.client_address[0],self.headers.get('Range'))
                self.send_response(response['status']);self.headers_common();self.send_header('Content-Type',response['mime']);self.send_header('Content-Length',str(len(response['body'])))
                if response.get('range'):self.send_header('Content-Range',response['range'])
                self.end_headers();self.wfile.write(response['body'])
            except BridgeError as exc:self.json_reply(502,{'error':exc.code})
            except Exception:self.json_reply(502,{'error':'UPSTREAM_UNAVAILABLE'})
        def do_POST(self):
            supplied=self.headers.get('Authorization','')
            if not hmac.compare_digest(supplied,'Bearer '+bridge.config['access_key']):return self.json_reply(401,{'error':'UNAUTHORIZED'})
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=16384:raise BridgeError('INVALID_REQUEST')
                data=json.loads(self.rfile.read(length));path=urlsplit(self.path).path
                if not isinstance(data,dict):raise BridgeError('INVALID_REQUEST')
                if path=='/api/check':
                    try:engine=bridge.net.engine_info()
                    except Exception:engine={'available':False}
                    return self.json_reply(200,{'ok':True,'version':VERSION,'engine':engine})
                if path=='/api/stop':
                    sid=str(data.get('session_id') or '')
                    with bridge.lock:item=bridge.sessions.get(sid)
                    if item and item['client']!=self.client_address[0]:raise BridgeError('SESSION_EXPIRED')
                    bridge.stop(sid);return self.json_reply(200,{'ok':True})
                if path=='/api/stop-all':
                    # Local administrative shutdown before task updates/removal.
                    if self.client_address[0] not in ('127.0.0.1','::1',bridge.config.get('listen_host')):raise BridgeError('LOCAL_ONLY')
                    with bridge.lock:active=list(bridge.sessions)
                    for sid in active:bridge.stop(sid)
                    return self.json_reply(200,{'ok':True})
                if path!='/api/resolve':return self.json_reply(404,{'error':'NOT_FOUND'})
                source=data.get('source')
                if not isinstance(source,dict):raise BridgeError('INVALID_REQUEST')
                sid,session=bridge.prepare(source,self.client_address[0]);tail='index.m3u8' if session['kind']=='hls' else 'video.mp4'
                return self.json_reply(200,{'ok':True,'session_id':sid,'path':'/media/'+sid+'/'+tail,'kind':session['kind'],'transport_checked':True,'lg_tested':False})
            except BridgeError as exc:self.json_reply(422,{'error':exc.code})
            except Exception:self.json_reply(502,{'error':'UPSTREAM_UNAVAILABLE'})
    return Handler

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);parser.add_argument('--init-config',action='store_true');args=parser.parse_args();path=Path(args.config)
    if args.init_config:
        if path.exists():raise SystemExit('Configuration exists; not overwritten')
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps({'listen_host':'127.0.0.1','listen_port':9122,'engine_url':'http://127.0.0.1:6878','access_key':secrets.token_urlsafe(36)},indent=2)+'\n',encoding='utf-8')
        print('Private configuration created. Keep this file off GitHub.');return
    config=json.loads(path.read_text('utf-8-sig'));bridge=Bridge(config)
    server=ThreadingHTTPServer((config.get('listen_host','127.0.0.1'),int(config.get('listen_port',9122))),handler_for(bridge))
    server.daemon_threads=True
    def reap():
        while True:time.sleep(30);bridge.cleanup()
    threading.Thread(target=reap,daemon=True).start()
    print('Y7 Sport Bridge '+VERSION+' ready; private access key is not logged.')
    try:server.serve_forever()
    finally:
        for sid in list(bridge.sessions):bridge.stop(sid)
        server.server_close()

if __name__=='__main__':main()
