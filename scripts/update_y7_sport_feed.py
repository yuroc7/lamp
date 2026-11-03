#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Y7 Sport feed builder v1.1.7.

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
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from sport_streams import validate_channel
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
ALLOWED_UPSTREAM = {'livetv.sx','www.livetv.sx','site.api.espn.com','cdn.espn.com','livetv911.me','livetv906.me','livetv907.me','livetv-ru17.me','www.thesportsdb.com','match.uefa.com','suspilne.media','www.youtube.com','youtube.com'}

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check = urllib.parse.urlparse(newurl)
        if check.scheme != 'https' or check.hostname not in ALLOWED_UPSTREAM:
            raise ValueError('untrusted redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

MAX_LIVETV = 90
MAX_PLAYER_PROBES = MAX_LIVETV
MAX_PLAYERS_PER_EVENT = 6
MAX_FIXTURES = 1500

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

# Verified official catalog entries. These are service pages, never HLS URLs.
SERVICES[1].update(url='https://www.fifa.com/dazn',note='FIFA+ перейшов на DAZN; безкоштовний футбольний контент, реєстрація та геоправа залежать від події.')
SERVICES[4].update(url='https://www.redbull.tv/en_US')
SERVICES.extend([
    {'id':'uafyt','name':'УАФ · офіційне відео','category':'football','cost':'free_limited','url':'https://www.youtube.com/user/OfficialUkraineFA/streams',
     'note':'Офіційні відкриті ефіри збірних і турнірів УАФ, коли канал їх публікує; не всі матчі.'},
    {'id':'uplyt','name':'UPL TV · офіційне відео','category':'football','cost':'free_limited','url':'https://www.youtube.com/@upltv2023/streams',
     'note':'Огляди й окремі відкриті ефіри; безкоштовність усіх матчів УПЛ не обіцяється.'},
    {'id':'ehftv','name':'EHFTV','category':'handball','cost':'free_limited','url':'https://www.ehftv.com/',
     'note':'Офіційний гандбол EHF; частина контенту безкоштовна, преміальні матчі та геоправа перевіряй окремо.'},
    {'id':'dfb','name':'DFB Play','category':'football','cost':'free_limited','url':'https://www.dfbplay.tv/',
     'note':'Офіційний німецький футбол; безкоштовний застосунок не означає безкоштовність усіх матчів.'},
    {'id':'fibayt','name':'FIBA · офіційні трансляції','category':'basketball','cost':'free_limited','url':'https://www.youtube.com/FIBA/streams',
     'note':'Окремі офіційні відкриті ефіри; YouTube iframe, а не прямий HLS.'},
])

def official_embeds():
    """Only the exact broadcaster-published embed. Never third-party scripts.

    A published iframe is a provenance check, not native video validation.
    """
    page='https://suspilne.media/sport/schedule/tv/'
    target='https://gw-suspilne-sport.cosmonova-broadcast.tv/player'
    try:
        parser=PublicPlayers();parser.feed(get_url(page).decode('utf-8','replace'))
        if target in parser.frames:
            return [{'id':'suspilne-official','name':'Суспільне Спорт · офіційний плеєр','cost':'free',
                     'kind':'embed','url':target,'source_page':page,'provider':'Суспільне',
                     'note':'Офіційний iframe телеканалу; геоправа та реклама мовника діють. Це не прямий HLS.'}]
    except Exception:pass
    return []

# Channel identities linked by the broadcasters themselves. Never use search
# results, fan reuploads, signed Google Video URLs or YouTube cipher extraction.
YOUTUBE_CHANNELS=[
    ('uaf','УАФ','UC2lzyKjfyh3FN_f_iYmXlCA','football','https://uaf.ua/'),
    ('upl','UPL TV','UCuklcBTqyXchdLqpvI9LpTA','football','https://tv.upl.ua/'),
    ('suspilne','Суспільне Спорт','UCXZ4rKdpxhnhi5U4fEcJayQ','multi','https://suspilne.media/sport/'),
    ('fiba','FIBA','UCtInrnU3QbWqFGsdKT1GZtg','basketball','https://www.fiba.basketball/en/news/watch-live-on-the-fiba-youtube-channel-this-week'),
]

def youtube_live_from_html(html,channel,now):
    text=_decode_public_html(html)
    marker=re.search(r'(?:var\s+)?ytInitialPlayerResponse\s*=\s*',text)
    if not marker:return None
    # Parse literal JSON only. Never execute the page or inspect streamingData.
    data,_=json.JSONDecoder().raw_decode(text[marker.end():])
    status=data.get('playabilityStatus') or {}
    details=data.get('videoDetails') or {}
    live=((data.get('microformat') or {}).get('playerMicroformatRenderer') or {}).get('liveBroadcastDetails') or {}
    video=str(details.get('videoId') or '')
    if status.get('status')!='OK' or status.get('playableInEmbed') is not True or live.get('isLiveNow') is not True:return None
    if details.get('channelId')!=channel[2] or not re.fullmatch(r'[A-Za-z0-9_-]{11}',video):return None
    return {'id':channel[0]+'-'+video,'title':str(details.get('title') or channel[1])[:180],
            'kind':'youtube','video_id':video,'url':'https://www.youtube.com/watch?v='+video,
            'provider':channel[1],'sport':channel[3],'status':'live','cost':'free',
            'official_channel_id':channel[2],'source_page':channel[4],
            'checked_at':now.isoformat().replace('+00:00','Z'),
            'note':'Офіційний відкритий YouTube LIVE · через підтримку YouTube у Lampa, не HLS. Геоправа та реклама YouTube діють.'}

def fetch_official_live(now):
    paths={'uaf':'user/OfficialUkraineFA/live','upl':'@upltv2023/live','suspilne':'@SuspilneSport/live','fiba':'@FIBA/live'}
    def one(channel):
        try:
            raw=get_url('https://www.youtube.com/'+paths[channel[0]],5_000_000)
            return youtube_live_from_html(raw,channel,now)
        except Exception:return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return [x for x in pool.map(one,YOUTUBE_CHANNELS) if x]


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
        if matches:
            CALENDAR_SOURCES[slug]='ESPN Site API'
            return matches
        single=json.loads(get_url(base+'?dates='+(date_start+timedelta(days=1)).strftime('%Y%m%d'),5_000_000))
        matches=[x for e in single.get('events',[]) if (x:=event_to_fixture(e,slug))]
        if matches:
            CALENDAR_SOURCES[slug]='ESPN Site API'
            return matches
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
    if matches:
        CALENDAR_SOURCES[slug]='ESPN CDN'
        return matches
    try:
        other=fetch_sportsdb(slug,date_start,date_end)
        if other:
            CALENDAR_SOURCES[slug]='TheSportsDB V1'
            return other
    except Exception as exc:errors.append('sportsdb:'+type(exc).__name__)
    raise RuntimeError('Calendar unavailable: '+','.join(sorted(set(errors))[:4]))


# IDs verified against https://comp.uefa.com/v2/competitions, not guessed.
UEFA_IDS={'uefa.champions':'1','uefa.europa':'14','uefa.europa.conf':'2019'}
UEFA_CODES={'uefa.champions':'UCL','uefa.europa':'UEL','uefa.europa.conf':'UECL'}
UEFA_PATHS={'uefa.champions':'uefachampionsleague','uefa.europa':'uefaeuropaleague','uefa.europa.conf':'uefaconferenceleague'}
CALENDAR_DETAILS={}

def event_from_uefa(obj,slug,season):
    if not isinstance(obj,dict):raise ValueError('UEFA match must be an object')
    competition=obj.get('competition') or {}
    if str(competition.get('id'))!=UEFA_IDS[slug] or competition.get('code')!=UEFA_CODES[slug]:
        raise ValueError('wrong UEFA competition')
    if str(obj.get('seasonYear'))!=str(season):raise ValueError('wrong UEFA season')
    home=obj.get('homeTeam') or {};away=obj.get('awayTeam') or {}
    # Undrawn opponents and unannounced times are not confirmed fixtures.
    if home.get('isPlaceHolder') or away.get('isPlaceHolder'):return None
    h=str(home.get('internationalName') or '').strip()[:90]
    a=str(away.get('internationalName') or '').strip()[:90]
    if not h or not a:return None
    stamp=(obj.get('kickOffTime') or {}).get('dateTime')
    if not stamp:return None
    dt=datetime.fromisoformat(stamp.replace('Z','+00:00'))
    if not dt.tzinfo:raise ValueError('UEFA kickoff without timezone')
    status=str(obj.get('status') or '').upper()
    state={'UPCOMING':'scheduled','SCHEDULED':'scheduled','FINISHED':'finished',
           'LIVE':'live','IN_PROGRESS':'live','PLAYING':'live','PAUSED':'live',
           'POSTPONED':'postponed','CANCELLED':'cancelled'}.get(status,'unknown')
    event={'id':'uefa-'+str(obj['id']),'league':LEAGUES[slug][0],
           'competition':LEAGUES[slug][1],'rank':LEAGUES[slug][2],
           'home':h,'away':a,'kickoff':dt.astimezone(timezone.utc).isoformat().replace('+00:00','Z'),
           'status':state,'important':home.get('countryCode')=='UKR' or away.get('countryCode')=='UKR' or bool(UA_TERMS.search(h+' '+a)),
           'source':'UEFA','source_url':'https://www.uefa.com/'+UEFA_PATHS[slug]+'/match/'+str(obj['id'])+'/',
           'broadcast':{'name':'Перевірити офіційного мовника','cost':'unknown',
                        'url':'https://www.uefa.com/'+UEFA_PATHS[slug]+'/','note':'Календар не підтверджує телеправа чи безкоштовний ефір'}}
    score=(obj.get('score') or {}).get('total') or {}
    if state in ('live','finished') and score.get('home') is not None and score.get('away') is not None:
        event['score']=str(score['home'])+' : '+str(score['away'])
    return event

def fetch_uefa(slug,date_start,date_end):
    season=date_end.year  # end is June 30, including the July 1 boundary
    matches=[];seen=set();skipped=0;page_size=100
    for offset in range(0,1500,page_size):
        query=urllib.parse.urlencode({'competitionId':UEFA_IDS[slug],'seasonYear':season,
             'fromDate':date_start.isoformat(),'toDate':date_end.isoformat(),
             'order':'ASC','offset':offset,'limit':page_size})
        raw=json.loads(get_url('https://match.uefa.com/v5/matches?'+query,6_000_000))
        if not isinstance(raw,list):raise ValueError('unexpected UEFA response')
        for obj in raw:
            event=event_from_uefa(obj,slug,season)
            if event is None:skipped+=1;continue
            if event['id'] in seen:raise ValueError('UEFA pagination repeated an event')
            seen.add(event['id'])
            local=datetime.fromisoformat(event['kickoff'].replace('Z','+00:00')).astimezone(TZ).date()
            if date_start<=local<=date_end:matches.append(event)
        if len(raw)<page_size:
            CALENDAR_DETAILS[slug]={'provider':'UEFA','complete_response':True,'skipped_unannounced':skipped,'matches':len(matches)}
            CALENDAR_SOURCES[slug]='UEFA'
            return matches
    raise ValueError('UEFA pagination budget exhausted')

def fetch_calendar(slug,date_start,date_end):
    try:return fetch_uefa(slug,date_start,date_end)
    except Exception as exc:
        # The fallback is explicitly partial. UEFA is the full announced schedule.
        CALENDAR_DETAILS[slug]={'provider':'fallback','complete_response':False,'uefa_error':type(exc).__name__}
        return fetch_espn(slug,date_start,min(date_end,date_start+timedelta(days=14)))


# TheSportsDB publishes a public, limited V1 calendar. Treat it as a fallback,
# not as official broadcasting information; do not guess missing kickoff times.
SPORTSDB_IDS={'uefa.champions':'4480','uefa.europa':'4481'}
CALENDAR_SOURCES={}

def event_from_sportsdb(obj,slug):
    if not isinstance(obj,dict) or slug not in LEAGUES:return None
    home=str(obj.get('strHomeTeam') or '').strip()[:90]
    away=str(obj.get('strAwayTeam') or '').strip()[:90]
    if not home or not away:return None
    stamp=str(obj.get('strTimestamp') or '')
    if not stamp:return None
    try:
        dt=datetime.fromisoformat(stamp.replace('Z','+00:00'))
        if not dt.tzinfo:return None  # no guessed timezone
        dt=dt.astimezone(timezone.utc)
    except (ValueError,TypeError):return None
    status=str(obj.get('strStatus') or '').strip().lower()
    done=status in ('match finished','finished','ft','full time','after extra time')
    rank,competition=LEAGUES[slug][2],LEAGUES[slug][1]
    result={'id':'tsdb-'+str(obj.get('idEvent') or dt.isoformat()+home+away)[:100],
            'league':LEAGUES[slug][0], 'competition':competition,'rank':rank,
            'home':home,'away':away,'kickoff':dt.isoformat().replace('+00:00','Z'),
            'status':'finished' if done else 'scheduled',
            'important':bool(UA_TERMS.search(home+' '+away)),
            'broadcast':{'name':'Перевірити офіційного мовника', 'cost':'unknown',
                         'url':'https://www.uefa.com/', 'note':'Джерело календаря не повідомляє телеправа'},
            'source':'TheSportsDB public V1'}
    if done and obj.get('intHomeScore') is not None and obj.get('intAwayScore') is not None:
        result['score']=str(obj['intHomeScore'])+' : '+str(obj['intAwayScore'])
    return result

def fetch_sportsdb(slug,date_start,date_end):
    league=SPORTSDB_IDS.get(slug)
    if not league:return []
    season=str(date_start.year if date_start.month>=7 else date_start.year-1)
    url='https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id='+league+'&s='+season+'-'+str(int(season)+1)
    data=json.loads(get_url(url,3_000_000))
    events=data.get('events') if isinstance(data,dict) else []
    lower=date_start.date() if isinstance(date_start,datetime) else date_start
    upper=date_end.date() if isinstance(date_end,datetime) else date_end
    result=[]
    for obj in (events or []):
        event=event_from_sportsdb(obj,slug)
        if event:
            local_day=datetime.fromisoformat(event['kickoff'].replace('Z','+00:00')).astimezone(TZ).date()
            if lower<=local_day<=upper:result.append(event)
    return result


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


def livetv_ukrainian_url(raw):
    """Map supported LiveTV event/home URLs to the actual /ua/ locale.

    Never change an unrelated host or infer a direct media URL.
    """
    p=urllib.parse.urlsplit(str(raw or ''))
    if p.scheme!='https' or p.hostname not in ('livetv.sx','www.livetv.sx'):
        return str(raw or '')
    path=re.sub(r'^/(?:enx|ua)(?=/|$)','',p.path,flags=re.I)
    return urllib.parse.urlunsplit(('https','livetv.sx','/ua'+(path or '/'),p.query,''))


def infer_livetv_competition(hint):
    hint=str(hint or '').lower()
    if re.search(r'ліга чемпіонів|лига чемпионов|champions league|liga champions',hint):return 'Ліга чемпіонів'
    if re.search(r'ліга європи|лига европы|europa league',hint):return 'Ліга Європи'
    if re.search(r'конференц|conference league',hint):return 'Ліга конференцій'
    return ''


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
        good[it['id']]={'id':it['id'],'title':title,'url':livetv_ukrainian_url(url),'sport':'football','provider':'LiveTV','playable':False,'competition':infer_livetv_competition(hint)}
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
        self.frames=[];self.media=[];self.links=[];self.textareas=[];self.in_textarea=False;self.buf=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='a':self.links.append(str(attrs.get('href') or ''))
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


def _decode_public_html(html):
    if not isinstance(html,bytes):return str(html)
    header=html[:4000].lower()
    charset='cp1251' if b'windows-1251' in header or b'charset=cp1251' in header else 'utf-8'
    return html.decode(charset,'replace')

# Match only literal iframe markup. Do not interpret arbitrary URLs found in scripts.
IFRAME_MARKUP=re.compile(r'(?is)<iframe\b[^>]{0,3000}>')
IFRAME_SRC=re.compile(r"(?i)\bsrc\s*=\s*(?:\"([^\"]{1,2200})\"|\x27([^\x27]{1,2200})\x27|([^\s>]{1,2200}))")

def discover_iframe_markup(html):
    """Find literal iframe markup in raw HTML/escaped templates; never execute JS."""
    raw=re.sub(r'(?s)<!--.*?-->','',_decode_public_html(html))
    # Some publishers HTML-escape iframe markup inside textareas or JS templates.
    # Do not evaluate scripts or follow these URLs. Each is validated by add().
    variants=(raw,unescape(raw),unescape(raw).replace('\\"','"').replace('\\/','/'))
    urls=[];seen=set()
    for body in variants:
        for tag in IFRAME_MARKUP.finditer(body):
            match=IFRAME_SRC.search(tag.group(0))
            if match:
                url=(match.group(1) or match.group(2) or match.group(3) or '').strip()
                if url and url not in seen:seen.add(url);urls.append(url)
    return urls

def summarize_player_markup(html,event_url):
    raw=_decode_public_html(html)
    parsed=PublicPlayers()
    parsed.feed(raw)
    raw_markup=discover_iframe_markup(raw)
    parsed_embeds=sum(1 for u in parsed.frames if 'webplayer' in u.lower())
    escaped_embeds=sum(1 for u in raw_markup if 'webplayer' in u.lower())
    scoped=extract_public_players(raw,event_url)
    return {'webplayer_text':int('webplayer' in raw.lower()),
            'parsed_frames':len(parsed.frames),
            'parsed_webplayers':parsed_embeds,
            'raw_iframe_markup':len(raw_markup),
            'raw_webplayers':escaped_embeds,
            'event_scoped_candidates':len(scoped)}

def extract_public_players(html,event_url):
    """Extract declared, non-DRM source/iframe URLs only; does NOT assert rights.

    The official LiveTV webmaster single-event iframe code is preferable.
    Third-party iframe embeds and scripts are deliberately not visited/executed.
    """
    html=_decode_public_html(html)
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
        params=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        if any(k.lower() in ('x','key','token','auth','apikey','api_key','secret','signature','sig','session','expires','hdnea','hdnts','jwt') for k in params):return
        if kind=='embed':
            u=urllib.parse.urlsplit(url)
            if u.hostname.lower() not in LIVETV_HOSTS:return
            # Reject unrelated widgets, entire site, advertising iframes or channel aggregators.
            webplayer_link=u.path.lower()=='/webplayer2.php'
            if (not webplayer_link and not PLAYER_EXPORT.search(u.path)) or 'webmasters' in u.path.lower() or 'informers' in u.path.lower():return
            if not any(x in (u.path+'?'+u.query).lower() for x in ('webplayer','player')):return
            # A generic embed iframe on every event page is NOT a game stream.
            # Require the iframe URL to be explicitly scoped to this event.
            params=urllib.parse.parse_qs(u.query)
            if webplayer_link:
                # This is an actual event-page href, not a URL reconstructed by
                # evaluating show_webplayer() or the generic JS iframe template.
                if set(params)-{'t','c','lang','eid','lid','ci','si'}:return
                if any(len(values)!=1 for values in params.values()):return
                typ=params.get('t',[''])[0]
                if typ not in ('alieztv','tvope','youtube','html5'):return
                if not re.fullmatch(r'[A-Za-z0-9_-]{1,160}',params.get('c',[''])[0]):return
                if not re.fullmatch(r'\d{1,14}',params.get('lid',[''])[0]):return
            references=[v for k,vs in params.items() if k.lower() in ('event','eventid','event_id','match','matchid','id','eid') for v in vs]
            if not event_id or event_id not in references:return
            if any(x.lower() in ('token','auth','apikey','api_key','secret','signature','sig','session') for x in params):return
        elif not MEDIA_EXT.search(url) or urllib.parse.urlsplit(url).query:return
        seen.add(url)
        players.append({'kind':kind,'url':url,'title':('LiveTV · '+params.get('t',['iframe'])[0]+' · iframe') if kind=='embed' else 'Відеопотік із HTML',
                        'verified':False,'note':'Джерело знайдене в HTML; доступність та права не підтверджені'})
    for raw in parser.frames:add('embed',raw)
    for raw in parser.links:
        if urllib.parse.urlsplit(urllib.parse.urljoin(event_url,raw)).path.lower()=='/webplayer2.php':add('embed',raw)
    for raw in discover_iframe_markup(html):add('embed',raw)
    for raw in parser.media:add('direct',raw)
    return players[:MAX_PLAYERS_PER_EVENT]

LAST_LIVETV_PROBES = {}
def fetch_livetv():
    errors=[];events={}
    LAST_LIVETV_PROBES.clear()
    LAST_LIVETV_PROBES.update({'attempted':0,'fetched':0,'errors':0,'with_embeds':0,'with_media':0,'without_event_id':0,'with_webplayer_text':0,'with_raw_webplayer_markup':0,'event_scoped_candidates':0,'error_types':{}})
    for url in ('https://livetv.sx/ua/allupcoming/', 'https://livetv.sx/ua/', 'https://livetv.sx/enx/allupcomingsports/1/'):
        try:
            for e in parse_livetv(get_url(url),url,assume_football=('/allupcomingsports/1/' in url)):
                events.setdefault(e['id'],e)  # Ukrainian labels and URLs are preferred
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
                    event['checked_at']=utc_now().isoformat().replace('+00:00','Z')
                    event['playable']=False  # discovery is not playback validation or a rights grant
                    # Debug metrics: no URLs, cookies, query values, or HTML are retained.
                    parsed=PublicPlayers()
                    parsed.feed(html.decode('cp1251','replace') if isinstance(html,bytes) and b'windows-1251' in html[:1500].lower() else (html.decode('utf-8','replace') if isinstance(html,bytes) else html))
                    LAST_LIVETV_PROBES['with_embeds']+=int(any('webplayer' in x.lower() for x in parsed.frames))
                    LAST_LIVETV_PROBES['with_media']+=int(bool(parsed.media))
                    markup=summarize_player_markup(html,event['url'])
                    LAST_LIVETV_PROBES['with_webplayer_text']+=markup['webplayer_text']
                    LAST_LIVETV_PROBES['with_raw_webplayer_markup']+=int(markup['raw_webplayers']>0)
                    LAST_LIVETV_PROBES['event_scoped_candidates']+=markup['event_scoped_candidates']
                    LAST_LIVETV_PROBES['without_event_id']+=int(bool(markup['raw_webplayers']) and not event['players'])
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
    s=re.sub(r'\b(fc|cf|ac|sc|donetsk|cp|донецьк|донецк)\b','',s)
    return re.sub(r'[^a-zа-яіїєґ0-9]','',s)


def merge_fixtures(fixtures, today):
    # Keep all announced fixtures; deduplicate by provider-independent identity.
    unique={}
    for original in fixtures:
        e=dict(original)
        try:
            dt=datetime.fromisoformat(e['kickoff'].replace('Z','+00:00'))
            if not dt.tzinfo:continue
        except (KeyError,ValueError,TypeError):continue
        if dt.astimezone(TZ).date()<today-timedelta(days=1):continue
        key=(e['league'],e['kickoff'][:10],norm(e['home']),norm(e['away']))
        old=unique.get(key)
        if old is None or (old.get('stale') and not e.get('stale')) or (old['status']=='scheduled' and e['status']!='scheduled'):
            unique[key]=e
    if len(unique)>MAX_FIXTURES:raise ValueError('calendar exceeds explicit size budget')
    return sorted(unique.values(),key=lambda e:(not e['important'],e['status']!='live',e['kickoff'],e.get('rank',0)))


CHANNEL_HEALTH={}

def validated_channels(now=None,probe=None):
    now=now or utc_now()
    CHANNEL_HEALTH.clear();CHANNEL_HEALTH.update({'checked':0,'accepted':0,'rejected':0,'errors':[]})
    if not CHANNELS.is_file():return []
    raw=json.loads(CHANNELS.read_text('utf-8-sig'))
    channels=[];seen=set()
    for item in raw.get('channels',[])[:30]:
        if not isinstance(item,dict) or item.get('authorized') is not True:continue
        CHANNEL_HEALTH['checked']+=1
        try:
            channel=validate_channel(item,now,**({'probe':probe} if probe else {}))
            if channel and channel['url'] not in seen:
                seen.add(channel['url']);channels.append(channel)
        except Exception as exc:
            CHANNEL_HEALTH['rejected']+=1
            # No URLs, query strings, upstream HTML or exception messages in feed.
            CHANNEL_HEALTH['errors'].append(type(exc).__name__)
    CHANNEL_HEALTH['accepted']=len(channels)
    return channels


def load_old():
    if not OUTPUT.is_file():return {}
    try:return json.loads(OUTPUT.read_text('utf-8'))
    except (ValueError,OSError):return {}


def build(now=None, espn_fn=None, livetv_fn=fetch_livetv, official_fn=official_embeds, youtube_fn=fetch_official_live):
    CALENDAR_SOURCES.clear()
    CALENDAR_DETAILS.clear()
    now=now or utc_now();today=now.astimezone(TZ).date()
    begin=today-timedelta(days=1)
    end=datetime(today.year+1 if today.month>=7 else today.year,6,30).date()
    espn_fn=espn_fn or fetch_calendar
    fixture_results=[];failed=[];succeeded=set();cached_leagues=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(espn_fn,slug,begin,end):slug for slug in LEAGUES}
        for future in concurrent.futures.as_completed(futures):
            try:
                fixture_results.extend(future.result());succeeded.add(futures[future])
            except Exception as e: failed.append(futures[future]+':'+type(e).__name__)
    try:live_events,live_errors=livetv_fn()
    except Exception as e:live_events=[];live_errors=[type(e).__name__]
    old=load_old()
    # Fallback independently for each failed league, preserving original age.
    # Never rejuvenate cached entries just because another part of the feed updated.
    for slug in LEAGUES:
        if slug in succeeded:continue
        for item in old.get('fixtures',[]):
            if not isinstance(item,dict) or item.get('league')!=LEAGUES[slug][0]:continue
            try:
                checked=datetime.fromisoformat(str(item.get('checked_at') or old.get('updated_at','')).replace('Z','+00:00'))
                kickoff=datetime.fromisoformat(item['kickoff'].replace('Z','+00:00'))
                if not checked.tzinfo or not kickoff.tzinfo:continue
                if not timedelta(0)<=now-checked<=timedelta(hours=24):continue
                if not now-timedelta(hours=24)<=kickoff<=now+timedelta(days=370):continue
            except (TypeError,KeyError,ValueError):continue
            copy=dict(item);copy['stale']=True;copy['checked_at']=checked.isoformat().replace('+00:00','Z')
            fixture_results.append(copy);cached_leagues.append(slug)
    if not live_events and isinstance(old.get('livetv'),list):
        # LiveTV event links expire; never keep them longer than 24h during outages.
        try:stamp=datetime.fromisoformat(old.get('livetv_checked_at',old.get('updated_at','')).replace('Z','+00:00'))
        except ValueError:stamp=now-timedelta(days=2)
        if stamp.tzinfo and timedelta(0)<=now-stamp<timedelta(hours=6):live_events=old['livetv']
    for item in fixture_results:
        if not item.get('stale'):item['checked_at']=now.isoformat().replace('+00:00','Z')
        kickoff=datetime.fromisoformat(item['kickoff'].replace('Z','+00:00'))
        if item.get('status') in ('scheduled','live') and kickoff<now-timedelta(hours=4):item['status']='unknown'
    fixture_results=merge_fixtures(fixture_results,today)
    try:channels=validated_channels(now)
    except (OSError,ValueError):channels=[]
    return {
        'schema':1,'version':'1.1.7',
        'updated_at':now.isoformat().replace('+00:00','Z'),
        'timezone':'Europe/Kyiv',
        'fixtures':fixture_results,
        'livetv':live_events[:MAX_LIVETV],
        'livetv_checked_at':(old.get('livetv_checked_at',old.get('updated_at')) if live_errors and live_events else now.isoformat().replace('+00:00','Z')),
        'services':SERVICES,
        'official_embeds':official_fn(),
        'official_live':youtube_fn(now),
        'channels':channels,
        'health':{'fixtures_ok':len(LEAGUES)-len(failed),'fixtures_total':len(LEAGUES),
                  'fixtures_fallback':bool(cached_leagues),
                  'calendar_cached_leagues':sorted(set(cached_leagues)),
                  'calendar_through':end.isoformat(),
                  'calendar_scope':'Announced UEFA club fixtures through season end; unknown draws are not invented',
                  'calendar_sources':dict(CALENDAR_SOURCES),
                  'calendar_details':dict(CALENDAR_DETAILS),
                  'channel_checks':dict(CHANNEL_HEALTH),
                  'livetv_ok':not bool(live_errors),'livetv_errors':len(live_errors),
                  'livetv_note':'LiveTV: explicit public player embeds/video tags only; player availability unverified',
                  'livetv_player_probes':dict(LAST_LIVETV_PROBES),
                  'livetv_players_found':sum(len(e.get('players') or []) for e in live_events),
                  'livetv_events_with_players':sum(bool(e.get('players')) for e in live_events),
                  'errors':(failed+live_errors)[:7]}
    }


def main():
    data=build()
    candidate=OUTPUT.with_suffix('.tmp')
    candidate.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    candidate.replace(OUTPUT)
    print('Y7 Sport feed: %d fixtures; %d LiveTV event links; %d services; Calendar leagues available %d/%d' % (
        len(data['fixtures']),len(data['livetv']),len(data['services']),data['health']['fixtures_ok'],len(LEAGUES)))
    print('LiveTV player candidates: %d in %d events (not verified playable)' % (data['health']['livetv_players_found'],data['health']['livetv_events_with_players']))
    print('LiveTV probes: '+json.dumps(data['health'].get('livetv_player_probes',{}),ensure_ascii=False,sort_keys=True))
    print('Official LIVE YouTube videos: %d; official broadcaster iframes: %d; authorized checked native media: %d' % (
        len(data.get('official_live',[])),len(data.get('official_embeds',[])),len(data['channels'])))
    return 0

if __name__=='__main__':
    raise SystemExit(main())
