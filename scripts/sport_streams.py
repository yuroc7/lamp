"""Bounded checks for explicitly authorized public media. No credentials/cookies.

Results prove HTTP/media structure at the probe location, not LG decoding, rights
in every country, or continued availability. Signed/private URLs never enter feed.
"""
from __future__ import annotations
import http.client
import ipaddress
import re
import socket
import ssl
from urllib.parse import urlsplit, urljoin
import xml.etree.ElementTree as ET

TIMEOUT=10
MIMES={'hls':{'application/vnd.apple.mpegurl','application/x-mpegurl','audio/mpegurl'},
       'mp4':{'video/mp4','application/mp4'},'dash':{'application/dash+xml'}}

def public_url(url):
    p=urlsplit(str(url))
    # Public GitHub feeds must not contain even temporarily signed URLs.
    if p.scheme!='https' or not p.hostname or p.username or p.password or p.query or p.fragment:
        raise ValueError('requires credential-free HTTPS URL without query/fragment')
    if p.port not in (None,443) or len(url)>2100:raise ValueError('unsupported media address')
    if p.hostname.lower()=='localhost' or p.hostname.lower().endswith(('.local','.internal','.localhost')):
        raise ValueError('non-public host')
    try:
        if not ipaddress.ip_address(p.hostname).is_global:raise ValueError('non-public IP')
    except ValueError as exc:
        if 'non-public' in str(exc):raise
    return p

def get_public(url,limit=262144,range_bytes=False):
    """Resolve only global IPs; pin TLS connection to validated IP, keep SNI.

    Every redirect is checked anew. No environment proxy, auth, Referer spoofing,
    cookies, or provider tokens. Body bounds also apply if Range is ignored.
    """
    for _ in range(4):
        p=public_url(url)
        addresses=socket.getaddrinfo(p.hostname,443,type=socket.SOCK_STREAM)
        ips=list(dict.fromkeys(x[4][0] for x in addresses))
        if not ips or any(not ipaddress.ip_address(ip).is_global for ip in ips):
            raise ValueError('DNS resolved non-public address')
        conn=http.client.HTTPSConnection(p.hostname,443,timeout=TIMEOUT,context=ssl.create_default_context())
        pinned=ips[0]
        conn._create_connection=lambda address,timeout=TIMEOUT,source_address=None: socket.create_connection((pinned,443),timeout,source_address)
        headers={'User-Agent':'Y7Sport/1.1.7 public-media-check','Accept':'*/*'}
        if range_bytes:headers['Range']='bytes=0-'+str(limit-1)
        try:
            conn.request('GET',p.path or '/',headers=headers)
            res=conn.getresponse()
            if res.status in (301,302,303,307,308):
                url=urljoin(url,res.getheader('Location') or '')
                continue
            if res.status not in (200,206):raise ValueError('media HTTP '+str(res.status))
            mime=(res.getheader('Content-Type') or '').split(';')[0].strip().lower()
            data=res.read(limit+1)
            if not range_bytes and len(data)>limit:raise ValueError('media response too large')
            return url,mime,data[:limit]
        finally:conn.close()
    raise ValueError('media redirect budget exhausted')

def check_media(url,fetch=get_public):
    public_url(url)
    suffix=urlsplit(url).path.lower()
    kind='hls' if suffix.endswith('.m3u8') else 'mp4' if suffix.endswith('.mp4') else 'dash' if suffix.endswith('.mpd') else ''
    if not kind:raise ValueError('not a direct media URL')
    final,mime,body=fetch(url,262144,kind=='mp4')
    if mime not in MIMES[kind]:raise ValueError('unexpected media MIME')
    result={'kind':kind,'mime':mime,'http_checked':True,'segment_checked':False,'lg_tested':False}
    if kind=='mp4':
        if len(body)<16 or body[4:8]!=b'ftyp':raise ValueError('not MP4 bytes')
        result['segment_checked']=True
    elif kind=='dash':
        root=ET.fromstring(body)
        if root.tag.split('}')[-1]!='MPD':raise ValueError('not DASH XML')
        if any(e.tag.split('}')[-1]=='ContentProtection' for e in root.iter()):raise ValueError('protected DASH')
        # A valid manifest alone does not prove video segments work. Leave out of
        # automatic native-play choices until a DASH segment resolver is tested.
        raise ValueError('DASH requires segment validation; use official service')
    else:
        for depth in range(4):
            text=body.decode('utf-8-sig')
            if not text.lstrip().startswith('#EXTM3U'):raise ValueError('not HLS text')
            if re.search(r'#EXT-X-(?:SESSION-)?KEY:(?!METHOD=NONE(?:,|\s|$))',text):raise ValueError('protected HLS')
            if '#EXT-X-STREAM-INF:' in text:
                # Prefer a broadly compatible H.264/AAC variant, then lowest
                # advertised bandwidth. Never claim this guarantees LG decoding.
                variants=[];lines=text.splitlines()
                for i,line in enumerate(lines[:-1]):
                    if line.startswith('#EXT-X-STREAM-INF:'):
                        target=next((x.strip() for x in lines[i+1:] if x.strip() and not x.startswith('#')),None)
                        if target:
                            codecs=re.search(r'CODECS="([^"]+)"',line)
                            c=codecs.group(1) if codecs else ''
                            bw=re.search(r'(?:^|,)BANDWIDTH=(\d+)',line.partition(':')[2])
                            variants.append((0 if 'avc1' in c and 'mp4a' in c else 1,int(bw.group(1)) if bw else 999999999,target,c))
                if not variants:raise ValueError('empty HLS master')
                _,_,target,codecs=min(variants)
                result['codecs']=codecs
                final,mime,body=fetch(urljoin(final,target),262144,False)
                if mime not in MIMES['hls']:raise ValueError('variant MIME is not HLS')
                continue
            segments=[x.strip() for x in text.splitlines() if x.strip() and not x.startswith('#')]
            if not segments:raise ValueError('empty HLS playlist')
            # Probe the newest segment to reduce failures from sliding live windows.
            _,segmime,data=fetch(urljoin(final,segments[-1]),65536,True)
            if not data or segmime.startswith(('text/','application/json')):raise ValueError('not media segment bytes')
            ts=len(data)>188 and any(data[i]==0x47 and data[i+188]==0x47 for i in range(min(188,len(data)-188)))
            fmp4=any(marker in data[:256] for marker in (b'ftyp',b'styp',b'moof',b'sidx'))
            if not ts and not fmp4:raise ValueError('unrecognized media segment')
            result['segment_checked']=True
            break
        if not result['segment_checked']:raise ValueError('HLS nesting budget exhausted')
    return result

def validate_channel(item,now,probe=check_media):
    if not isinstance(item,dict) or item.get('authorized') is not True:return None
    url=str(item.get('url') or '')
    public_url(url)
    source=str(item.get('source_page') or '')
    public_url(source)
    if not str(item.get('rights_note') or '').strip():raise ValueError('rights evidence required')
    checked=probe(url)
    return {'id':str(item.get('id',''))[:40],'title':str(item.get('title',''))[:100],
            'url':url,'authorized':True,'verified':True,'content_id':str(item.get('content_id') or '')[:80],
            'checked_at':now.isoformat().replace('+00:00','Z'),'source_page':source,
            'rights_note':str(item['rights_note'])[:300],'provider':str(item.get('provider',''))[:100],
            'note':str(item.get('note',''))[:160],'health':checked}
