#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Y7 Sport feed builder v1.1.2.

Public fixture metadata (ESPN), LiveTV event navigation, and detection of explicitly
published video tags and LiveTV single-event embed players. No DRM/paywall/ad
bypass, no scripts, no arbitrary third-party link following. The embed remains
third-party and may contain its own ads. Licensed custom channels stay separate.
"""
from __future__ import annotations

import concurrent.futures
from datetime import datetime, timedelta, timezone
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.parse
import ipaddress
import urllib.request
from urllib.request import build_opener, HTTPRedirectHandler
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'y7_sport_feed.json'
CHANNELS = ROOT / 'sport_channels.json'
TZ = ZoneInfo('Europe/Kyiv')
LEAGUES = {
    'uefa.champions': ('ucl', 'Ліга чемпіонів', 0),
    'uefa.europa': ('uel', 'Ліга Європи', 1),
    'uefa.europa.conf': ('uecl', 'Ліга конференцій', 2),
}
UA_TERMS = re.compile(r'(?iu)(shakhtar|shahtar|шахт[еа]р|донецьк|donetsk|dynamo kyiv|dynamo kiev|динамо ки[їе]в|polissya|полісся|кривбас|kryvbas|oleksandriya|олександрія|dnipro|дніпро|карпати|karpaty)')
EVENT_ID = re.compile(r'/eventinfo/(\d+)(?:_[^/?#]*)?/?', re.I)
TAG = re.compile(r'<[^>]+>')
FOOTBALL = re.compile(r'(?iu)\b(?:football|soccer|футбол|liga champions|лига чемпионов|ліга чемпіонів)\b')
OTHER_SPORT = re.compile(r'(?iu)\b(?:hockey|хоккей|tennis|теннис|basketball|баскетбол|volleyball|волейбол|mma|мма|бокс|boxing|snooker|снукер|baseball|бейcбол)\b')
TIMEOUT = 14
ALLOWED_UPSTREAM = {'livetv.sx','www.livetv.sx','site.api.espn.com','cdn.espn.com','livetv911.me','livetv906.me','livetv907.me','livetv-ru17.me'}

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check = urllib.parse.urlparse(newurl)
        if check.scheme != 'https' or check.hostname not in ALLOWED_UPSTREAM:
            raise ValueError('untrusted redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

MAX_LIVETV = 90
MAX_PLAYER_PROBES = 18
MAX_PLAYERS_PER_EVENT = 6
MAX_FIXTURES = 90

SERVICES = [
    {'id':'suspilne','name':'Суспільне Спорт','category':'ua','cost':'free','url':'https://suspilne.media/sport/schedule/live/', 'note':'Безкоштовні українські ефіри; права на кожну подію різні.'},
    {'id':'fifaplus','name':'FIFA+','category':'football','cost':'free_limited','url':'https://www.plus.fifa.com/', 'note':'Окремі прямі матчі й архів; геодоступність залежить від турніру.'},
    {'id':'uefatv','name':'UEFA.tv','category':'football','cost':'free_limited','url':'https://www.uefa.tv/', 'note':'Футбол, молодіжні турніри та повтори; основна чоловіча ЛЧ наживо недоступна.'},
    {'id':'eurovisionsport','name':'Eurovision Sport','category':'multi','cost':'free_limited','url':'https://eurovisionsport.com/en','note':'Багато видів спорту, частина трансляцій геообмежена.'},
    {'id':'redbull','name':'Red Bull TV','category':'multi','cost':'free','url':'https://www.redbull.com/int-en/live-events/','note':'Автоспорт, екстрим і події наживо.'},
    {'id':'worldathletics','name':'World Athletics+','category':'athletics','cost':'free_limited','url':'https://worldathletics.org/watch/plus','note':'Легка атлетика, залежно від геоправ.'},
    {'id':'rugbypass','name':'RugbyPass TV','category':'rugby','cost':'free_limited','url':'https://rugbypass.tv/','note':'Регбі: окремі ефіри, архів; може знадобитися реєстрація.'},
    {'id':'suspilnetv','name':'Суспільне Спорт · телеканал наживо','category':'ua','cost':'free','url':'https://suspilne.media/sport/schedule/tv/', 'note':'Офіційна сторінка прямого ефіру та розкладу українського телеканалу.'},
    {'id':'allsportdb','name':'AllSportDB Live','category':'schedule','cost':'free','url':'https://live.allsportdb.com/', 'note':'Розклад спортивних ефірів і офіційні посилання; не власний відеоплеєр.'},
    {'id':'megogo','name':'MEGOGO Футбол','category':'football','cost':'paid','url':'https://megogo.net/ua/sport','note':'Офіційний мовник чоловічої Ліги чемпіонів в Україні за передплатою.'},
]

FEATURED = {
    'id':'shakhtar_sporting_20261103',
    'league':'ucl','competition':'Ліга чемпіонів',
    'home':'Шахтар','away':'Спортінг',
    'kickoff':'2026-11-03T17:45:00Z',
    'status':'scheduled','important':True,
    'broadcast':{'name':'MEGOGO · Футбол Перший', 'cost':'paid','url':'https://megogo.net/ua/sport/28488016-shakhtar-sportinh.html', 'note':'В Україні лише з передплатою'},
    'livetv_url':'https://livetv.sx/eventinfo/399041287_shahter_sporting/',
    'source':'Офіційна сторінка MEGOGO, 03.11.2026',
}


def utc_now():
    return datetime.now(timezone.utc)


def get_url(url, limit=3_000_000):
    # Only fixed public metadata hosts, never an arbitrary URL read from HTML.
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_UPSTREAM:
        raise ValueError('untrusted upstream')
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','Accept-Language':'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7'})
    with build_opener(SafeRedirect()).open(req,timeout=TIMEOUT) as res:
        if res.status!=200: raise ValueError('HTTP '+str(res.status))
        data=res.read(limit+1)
        if len(data)>limit: raise ValueError('oversize response')
        return data


def event_to_fixture(e, slug):
    if not isinstance(e,dict): return None
    comps=e.get('competitions') or []
    comp=comps[0] if comps and isinstance(comps[0],dict) else {}
    if not isinstance(comp,dict): comp={}
    names={}; scores={}
    for c in comp.get('competitors') or []:
        if not isinstance(c,dict):continue
        which=c.get('homeAway')
        if which not in ('home','away'):continue
        t=c.get('team') or {}
        names[which]=str(t.get('displayName') or t.get('shortDisplayName') or '').strip()[:90]
        scores[which]=str(c.get('score') or '').strip()
    if not names.get('home') or not names.get('away'):return None
    try:
        dt=datetime.fromisoformat(str(e.get('date') or comp.get('date')).replace('Z','+00:00')).astimezone(timezone.utc)
    except (ValueError,TypeError):return None
    kind=((comp.get('status') or e.get('status') or {}).get('type') or {}).get('state')
    state='live' if kind=='in' else 'finished' if kind=='post' else 'scheduled'
    league,name,index=LEAGUES[slug]
    result={
        'id':str(e.get('id') or slug+'-'+dt.strftime('%Y%m%d')+'-'+names['home'])[:100],
        'league':league,'competition':name,'rank':index,
        'home':names['home'],'away':names['away'],
        'kickoff':dt.isoformat().replace('+00:00','Z'),
        'status':state,'important':bool(UA_TERMS.search(names['home']+' '+names['away'])),
        'broadcast':{'name':'MEGOGO Спорт','cost':'paid','url':'https://megogo.net/ua/sport','note':'Доступ залежить від конкретного матчу та передплати'},
        'source':'ESPN',
    }
    if state in ('live','finished') and scores.get('home') and scores.get('away'):
        result['score']=scores['home']+' : '+scores['away']
    return result


def _cdn_events(document):
    """ESPN CDN has wrapped `content.sbData` and raw forms across versions."""
    if not isinstance(document,dict):return []
    if isinstance(document.get('events'),list):return document['events']
    # Stay within known wrapper keys and depth: no arbitrary external URLs.
    for key in ('content','sbData','data','scoreboard'):
        if isinstance(document.get(key),dict):
            events=_cdn_events(document[key])
            if events:return events
    return []


def fetch_espn(slug, date_start, date_end):
    """Try site API first; on HTTP errors use ESPN's separate public CDN.

    Never pretend that cached/non-ESPN fixtures are confirmed by this fallback.
    """
    base=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard'
    url=base+'?dates='+date_start.strftime('%Y%m%d')+'-'+date_end.strftime('%Y%m%d')+'&limit=150'
    errors=[]
    try:
        raw=json.loads(get_url(url,5_000_000))
        matches=[x for e in raw.get('events',[]) if (x:=event_to_fixture(e,slug))]
        if matches:return matches
        single=json.loads(get_url(base+'?dates='+(date_start+timedelta(days=1)).strftime('%Y%m%d'),5_000_000))
        matches=[x for e in single.get('events',[]) if (x:=event_to_fixture(e,slug))]
        if matches:return matches
    except Exception as exc:
        errors.append(type(exc).__name__)
    # ESPN CDN is a distinct host that may remain accessible if Site API returns 403.
    # Date-scoped requests avoid dumping an entire season and cap request volume.
    matches=[];seen=set()
    for day in (date_start, date_start+timedelta(days=1), date_start+timedelta(days=3),date_start+timedelta(days=6)):
        try:
            u=f'https://cdn.espn.com/core/{slug}/scoreboard?xhr=1&date={day:%Y%m%d}'
            raw=json.loads(get_url(u,5_000_000))
            for item in _cdn_events(raw):
                ev=event_to_fixture(item,slug)
                if ev and ev['id'] not in seen:
                    seen.add(ev['id']);matches.append(ev)
        except Exception as exc: errors.append('cdn:'+type(exc).__name__)
    if matches:return matches
    raise RuntimeError('ESPN site/CDN unavailable: '+','.join(sorted(set(errors))[:4]))


class LiveTVLinks(HTMLParser):
    """Parse event-page links only; does not visit embeds or resolve video URLs."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[];self.cur=None;self.a_depth=0;self.last_image_alt='';self.last_tag_text=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='img':
            self.last_image_alt=str(a.get('alt',''))[:150]
        if tag=='a':
            href=a.get('href','')
            match=EVENT_ID.search(str(href))
            if match:
                self.cur={'id':match.group(1),'href':str(href),'title':str(a.get('title') or ''),'sport_hint':self.last_image_alt,'text':[]}
                self.a_depth=1
            elif self.cur:self.a_depth+=1
    def handle_data(self,data):
        if self.cur:
            self.cur['text'].append(data)
        else:
            # Provides a secondary hint for football-only pages.
            self.last_tag_text=str(data).strip()[:140] or self.last_tag_text
    def handle_endtag(self,tag):
        if tag=='a' and self.cur:
            self.a_depth-=1
            if self.a_depth<=0:
                self.cur['title']=(' '.join(self.cur['text']).strip() or self.cur['title'])[:140]
                if not self.cur['sport_hint']:self.cur['sport_hint']=self.last_tag_text
                self.links.append(self.cur)
                self.cur=None


def parse_livetv(html,base='https://livetv.sx/',assume_football=False):
    if isinstance(html,bytes):
        head=html[:1500].lower()
        if b'windows-1251' in head or b'charset=cp1251' in head:
            html=html.decode('cp1251','replace')
        else:
            html=html.decode('utf-8','replace')
    parser=LiveTVLinks();parser.feed(html)
    good={}
    for it in parser.links:
        title=' '.join(unescape(it['title']).split())
        hint=unescape(it['sport_hint']).lower()
        if len(title)<4 or len(title)>140:continue
        # Football fixture link only. Remove ambiguous stream pages and betting links.
        if not (' – ' in title or ' — ' in title or ' - ' in title or ' vs ' in title.lower()):continue
        if OTHER_SPORT.search(hint) and not FOOTBALL.search(hint):continue
        if not assume_football and not FOOTBALL.search(hint) and not re.search(r'(?iu)(shakhtar|sporting|шахт[еа]р|спортинг|atletico|атлетико|бавария|uefa|barcelona|барселона|реал|манчестер)',title):continue
        url=urllib.parse.urljoin(base,it['href']).split('#')[0]
        u=urllib.parse.urlparse(url)
        if u.scheme!='https' or u.hostname not in ('livetv.sx','www.livetv.sx','livetv911.me','livetv906.me','livetv907.me','livetv-ru17.me'):continue
        if not EVENT_ID.search(u.path):continue
        good[it['id']]={'id':it['id'],'title':title,'url':url,'sport':'football','provider':'LiveTV','playable':False}
    return list(good.values())


def probe_livetv_player_descriptions(html):
    """Public metadata only: count browser/AceStream *descriptions* on event pages.

    A listed player is never interpreted as a functional or authorized stream.
    No iframe URLs, iframe JS, tracking links, or raw media URLs are extracted.
    """
    if isinstance(html, bytes):
        head=html[:1500].lower()
        html=html.decode('cp1251' if b'windows-1251' in head else 'utf-8','replace')
    compact=' '.join(unescape(TAG.sub(' ', html)).split())
    marker=re.search(r'(?iu)(Ссылки для браузера|Browser Links|Links for browser)',compact)
    if not marker:return {}
    tail=compact[marker.end():marker.end()+8000]
    split=re.search(r'(?iu)(Ссылки AceStream|AceStream Links|Links AceStream)',tail)
    web=tail[:split.start()] if split else tail
    ace=tail[split.end():] if split else ''
    # Metadata on LiveTV can be outdated; count is NOT a playable link health check.
    web_count=min(90,len(re.findall(r'(?i)\b\d{3,5}\s*kbps\b',web)))
    ace_count=min(90,len(re.findall(r'(?i)\b\d{3,5}\s*kbps\b',ace[:4000])))
    return {'browser_options':web_count,'acestream_options':ace_count,'player_info':'Опис варіантів на сторінці; робота не перевірена'}


# A WebPlayer advertised by LiveTV can be an iframe, not a direct video source.
# Only accept *single-event* player exports published directly in the event HTML,
# and explicitly declared <video>/<source> URLs. Avoid arbitrary script strings,
# tracking links, ad frames, redirects, obfuscated JS, and unknown hosts.
PLAYER_EXPORT = re.compile(r'(?i)(?:^|/)(?:export|embed)/(?:[^?#]*/)?(?:webplayer|player)(?:[./?]|$)')
MEDIA_EXT = re.compile(r'(?i)\.(?:m3u8|mp4|mpd)(?:$|\?)')
LIVETV_HOSTS = {'livetv.sx','www.livetv.sx','livetv911.me','livetv906.me','livetv907.me','livetv-ru17.me'}

def _safe_public_url(raw,base):
    raw=unescape(str(raw or '')).strip().replace('\\/','/')
    if raw.lower().startswith(('javascript:','data:','blob:','file:')):return ''
    url=urllib.parse.urljoin(base,raw).split('#')[0]
    u=urllib.parse.urlsplit(url)
    if u.scheme!='https' or not u.hostname or u.username or u.password or len(url)>2100:return ''
    host=u.hostname.lower()
    if host in ('localhost','localhost.localdomain') or host.endswith(('.local','.internal')):return ''
    try:
        ip=ipaddress.ip_address(host)
        if not ip.is_global:return ''
    except ValueError:pass
    return url

class PublicPlayers(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.frames=[];self.media=[];self.textareas=[];self.in_textarea=False;self.buf=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='iframe':self.frames.append(str(attrs.get('src') or attrs.get('data-src') or ''))
        if tag=='input':
            v=str(attrs.get('value') or attrs.get('data-clipboard-text') or '')
            if '<iframe' in unescape(v).lower() and len(v)<9000:self.textareas.append(v)
        if tag in ('video','source','a'):
            u=attrs.get('src') or attrs.get('data-src') or (attrs.get('href') if tag=='a' else '') or ''
            if u and MEDIA_EXT.search(str(u)):self.media.append(str(u))
        if tag=='textarea':self.in_textarea=True;self.buf=[]
    def handle_data(self,text):
        if self.in_textarea:self.buf.append(text)
    def handle_endtag(self,tag):
        if tag=='textarea' and self.in_textarea:
            self.textareas.append(''.join(self.buf));self.in_textarea=False;self.buf=[]

def extract_public_players(html,event_url):
    """Extract declared, non-DRM source/iframe URLs only; does NOT assert rights.

    The official LiveTV webmaster single-event iframe code is preferable.
    Third-party iframe embeds and scripts are deliberately not visited/executed.
    """
    if isinstance(html,bytes):
        head=html[:1500].lower()
        html=html.decode('cp1251' if b'windows-1251' in head else 'utf-8','replace')
    parser=PublicPlayers()
    try:parser.feed(html)
    except Exception:return []
    for body in parser.textareas:
        # LiveTV publishes a ready-to-copy iframe embed in a textarea.
        if len(body)>9000:continue
        embedded=PublicPlayers()
        try:embedded.feed(unescape(body));parser.frames.extend(embedded.frames)
        except Exception:pass
    players=[];seen=set()
    event_match=EVENT_ID.search(urllib.parse.urlsplit(event_url).path)
    event_id=event_match.group(1) if event_match else ''
    def add(kind,raw):
        url=_safe_public_url(raw,event_url)
        if not url or url in seen:return
        if kind=='embed':
            u=urllib.parse.urlsplit(url)
            if u.hostname.lower() not in LIVETV_HOSTS:return
            # Reject unrelated widgets, entire site, advertising iframes or channel aggregators.
            if not PLAYER_EXPORT.search(u.path) or 'webmasters' in u.path.lower() or 'informers' in u.path.lower():return
            if not any(x in (u.path+'?'+u.query).lower() for x in ('webplayer','player')):return
            # A generic embed iframe on every event page is NOT a game stream.
            # Require the iframe URL to be explicitly scoped to this event.
            params=urllib.parse.parse_qs(u.query)
            references=[v for k,vs in params.items() if k.lower() in ('event','eventid','event_id','match','matchid','id','eid') for v in vs]
            if not event_id or event_id not in references:return
        elif not MEDIA_EXT.search(url):return
        seen.add(url)
        players.append({'kind':kind,'url':url,'title':'Вбудований плеєр LiveTV' if kind=='embed' else 'Відеопотік із HTML',
                        'verified':False,'note':'Джерело знайдене в HTML; доступність та права не підтверджені'})
    for raw in parser.frames:add('embed',raw)
    for raw in parser.media:add('direct',raw)
    return players[:MAX_PLAYERS_PER_EVENT]

LAST_LIVETV_PROBES = {}
def fetch_livetv():
    errors=[];events={}
    LAST_LIVETV_PROBES.clear()
    LAST_LIVETV_PROBES.update({'attempted':0,'fetched':0,'errors':0,'with_embeds':0,'with_media':0,'without_event_id':0,'error_types':{}})
    for url in ('https://livetv.sx/enx/allupcomingsports/1/', 'https://livetv.sx/', 'https://livetv.sx/allupcoming/'):
        try:
            for e in parse_livetv(get_url(url),url,assume_football=('/allupcomingsports/1/' in url)):events[e['id']]=e
        except Exception as exc:
            errors.append(type(exc).__name__)
    listed=list(events.values())[:MAX_LIVETV]
    # Fetch event pages and detect only explicit player embed codes or media tags.
    # Budget is limited to avoid overloading upstream and GitHub Actions timeouts.
    priority=sorted(listed,key=lambda e:(0 if UA_TERMS.search(e['title']) else 1,0 if re.search(r'(?iu)(champions|чемпионов|чемпіонів|барселона|sporting|спoртинг)',e['title']) else 1))[:MAX_PLAYER_PROBES]
    LAST_LIVETV_PROBES['attempted']=len(priority)
    if priority:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            jobs={pool.submit(get_url,e['url']):e for e in priority}
            for future in concurrent.futures.as_completed(jobs):
                event=jobs[future]
                try:
                    html=future.result()
                    LAST_LIVETV_PROBES['fetched']+=1
                    event.update(probe_livetv_player_descriptions(html))
                    event['players']=extract_public_players(html,event['url'])
                    event['playable']=bool(event['players'])
                    # Debug metrics: no URLs, cookies, query values, or HTML are retained.
                    parsed=PublicPlayers()
                    parsed.feed(html.decode('cp1251','replace') if isinstance(html,bytes) and b'windows-1251' in html[:1500].lower() else (html.decode('utf-8','replace') if isinstance(html,bytes) else html))
                    LAST_LIVETV_PROBES['with_embeds']+=int(any('webplayer' in x.lower() for x in parsed.frames))
                    LAST_LIVETV_PROBES['with_media']+=int(bool(parsed.media))
                    LAST_LIVETV_PROBES['without_event_id']+=int(bool(parsed.frames) and not event['players'])
                except Exception as exc:
                    event['probe_status']='fetch_error'
                    event['players']=[]
                    event['playable']=False
                    LAST_LIVETV_PROBES['errors']+=1
                    kind=type(exc).__name__
                    LAST_LIVETV_PROBES['error_types'][kind]=LAST_LIVETV_PROBES['error_types'].get(kind,0)+1
    return listed,errors


def norm(name):
    s=str(name).lower()
    s=re.sub(r'\b(fc|cf|ac|sc|shakhtar|donetsk|cp|донецьк|донецк)\b','',s)
    return re.sub(r'[^a-zа-яіїєґ0-9]','',s)


def merge_fixtures(fixtures, today):
    unique={}
    for e in fixtures:
        key=(e['league'],e['kickoff'][:10],norm(e['home']),norm(e['away']))
        old=unique.get(key)
        if old is None or (old['status']=='scheduled' and e['status']!='scheduled'):unique[key]=e
    if datetime(2026,11,2).date()<=today<=datetime(2026,11,4).date():
        featured=FEATURED.copy()
        for key,x in list(unique.items()):
            title=(x['home']+' '+x['away']).lower()
            if x['league']=='ucl' and x['kickoff'][:10]=='2026-11-03' and any(v in title for v in ('shakhtar','шахт')) and any(v in title for v in ('sporting','спортинг')):
                x['important']=True
                x['broadcast']=FEATURED['broadcast']
                x['livetv_url']=FEATURED['livetv_url']
                break
        else:
            unique[(featured['league'],featured['kickoff'][:10],norm(featured['home']),norm(featured['away']))]=featured
    return sorted(unique.values(),key=lambda e:(not e['important'],e['status']!='live',e['kickoff'],e.get('rank',0)))[:MAX_FIXTURES]


def validated_channels():
    if not CHANNELS.is_file():return []
    raw=json.loads(CHANNELS.read_text('utf-8'))
    channels=[];seen=set()
    for item in raw.get('channels',[]):
        if not isinstance(item,dict) or item.get('authorized') is not True:continue
        url=str(item.get('url') or '')
        u=urllib.parse.urlparse(url)
        if u.scheme!='https' or not u.hostname or u.username or u.password:continue
        if not re.search(r'\.(?:m3u8|mp4|mpd)(?:$|\?)',u.path+'?'+u.query,re.I):continue
        if (u.hostname,url) in seen:continue
        seen.add((u.hostname,url))
        channels.append({'id':str(item.get('id',''))[:40], 'title':str(item.get('title',''))[:100],
                         'url':url, 'authorized':True, 'note':str(item.get('note',''))[:160],
                         'provider':str(item.get('provider',''))[:100]})
    return channels[:30]


def load_old():
    if not OUTPUT.is_file():return {}
    try:return json.loads(OUTPUT.read_text('utf-8'))
    except (ValueError,OSError):return {}


def build(now=None, espn_fn=fetch_espn, livetv_fn=fetch_livetv):
    now=now or utc_now();today=now.astimezone(TZ).date()
    begin=today-timedelta(days=1)
    end=today+timedelta(days=8)
    fixture_results=[];failed=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(espn_fn,slug,begin,end):slug for slug in LEAGUES}
        for future in concurrent.futures.as_completed(futures):
            try: fixture_results.extend(future.result())
            except Exception as e: failed.append(futures[future]+':'+type(e).__name__)
    try:live_events,live_errors=livetv_fn()
    except Exception as e:live_events=[];live_errors=[type(e).__name__]
    old=load_old()
    if not fixture_results and isinstance(old.get('fixtures'),list):
        # Preserve only future/recent entries and explicitly mark stale.
        for item in old['fixtures']:
            try:date=datetime.fromisoformat(item['kickoff'].replace('Z','+00:00'))
            except (TypeError,KeyError,ValueError):continue
            if date>=now-timedelta(hours=24) and date<=now+timedelta(days=9):fixture_results.append(item)
    if not live_events and isinstance(old.get('livetv'),list):
        # LiveTV event links expire; never keep them longer than 24h during outages.
        try:stamp=datetime.fromisoformat(old.get('updated_at','').replace('Z','+00:00'))
        except ValueError:stamp=now-timedelta(days=2)
        if now-stamp<timedelta(hours=24):live_events=old['livetv']
    fixture_results=merge_fixtures(fixture_results,today)
    try:channels=validated_channels()
    except (OSError,ValueError):channels=[]
    return {
        'schema':1,'version':'1.1.2',
        'updated_at':now.isoformat().replace('+00:00','Z'),
        'timezone':'Europe/Kyiv',
        'fixtures':fixture_results,
        'livetv':live_events[:MAX_LIVETV],
        'services':SERVICES,
        'channels':channels,
        'health':{'fixtures_ok':len(LEAGUES)-len(failed),'fixtures_total':len(LEAGUES),
                  'fixtures_fallback':bool(failed and not fixture_results),
                  'livetv_ok':not bool(live_errors),'livetv_errors':len(live_errors),
                  'livetv_note':'LiveTV: explicit public player embeds/video tags only; player availability unverified',
                  'livetv_player_probes':dict(LAST_LIVETV_PROBES),
                  'livetv_players_found':sum(len(e.get('players') or []) for e in live_events),
                  'livetv_events_with_players':sum(bool(e.get('players')) for e in live_events),
                  'errors':(failed+live_errors)[:7]}
    }


def main():
    data=build()
    # Never replace an otherwise valid feed with all empty data due to an outage.
    if not data['fixtures'] and not data['livetv'] and OUTPUT.is_file():
        print('Feeds unavailable; retaining prior snapshot')
        return 0
    candidate=OUTPUT.with_suffix('.tmp')
    candidate.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    candidate.replace(OUTPUT)
    print('Y7 Sport feed: %d fixtures; %d LiveTV event links; %d services; ESPN ok %d/%d' % (
        len(data['fixtures']),len(data['livetv']),len(data['services']),data['health']['fixtures_ok'],len(LEAGUES)))
    print('LiveTV player candidates: %d in %d events (not verified playable)' % (data['health']['livetv_players_found'],data['health']['livetv_events_with_players']))
    print('LiveTV probes: '+json.dumps(data['health'].get('livetv_player_probes',{}),ensure_ascii=False,sort_keys=True))
    return 0

if __name__=='__main__':
    raise SystemExit(main())
