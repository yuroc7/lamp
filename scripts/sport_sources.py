"""Public event/source metadata. Media URLs with credentials stay off Pages.

No provider JavaScript execution, protected API probing or stream authorization
claims. P2P identifiers are source references, never native video URLs.
"""
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs, urljoin
import concurrent.futures
import hashlib
import json
import re
import unicodedata

PROVIDERS=[
    {'id':'livetv','name':'LiveTV','url':'https://livetv.sx/ua/','supports':['resolver','acestream']},
    {'id':'daddy','name':'DaddyLiveHD','url':'https://thedaddy.pk/','supports':['resolver']},
    {'id':'ppv','name':'PPV','url':'https://ppv.st/','supports':['resolver']},
    {'id':'tim','name':'TimStreams','url':'https://tim-streams.com/','supports':['resolver']},
    {'id':'pit','name':'PitSport','url':'https://pitsport.st/','supports':['resolver']},
]
EXTRA_HOSTS={'thedaddy.pk','tim-streams.com','api.ppv.st','pitsport.st'}
TEAM_GROUPS={
 'barcelona':['барселона','fcbarcelona'], 'astonvilla':['астонвілла','астонвилла'],
 'atleticomadrid':['atleti','atletimadrid','атлетікомадрид','атлетикомадрид'],
 'bayern':['bayernmunchen','bayernmunich','баваріямюнхен','бавариямюнхен','баварія','бавария'],
 'manchesterunited':['manutd','манчестерюнайтед','манчестерюн'], 'roma':['asroma','рома'],
 'feyenoord':['feyenoordrotterdam','феєнорд','фейеноорд','фейєнорд','феєноорд'], 'inter':['internazionale','intermilan','интер','інтер'],
 'bodoglimt':['bodeglimt','бодоглімт','будеглімт','будеглимт','бодеглимт','бодоглимт'],
 'lille':['лілль','лилль'], 'villarreal':['вільярреал','вильярреал','вільяреал'],
 'psg':['paris','parissaintgermain','паріж','парисенжермен','парісенжермен','псж'],
 'lask':['lasklinz','ласк'], 'slovanbratislava':['sbratislava','bratislava','слованбратислава','слован'],
 'shakhtar':['shakhtardonetsk','shahtardonetsk','шахтар','шахтер','шахтардонецьк','шахтердонецк'],
 'sporting':['sportingcp','sportinglisbon','спортінг','спортинг'],
 'dynamokyiv':['dynamokiev','динамокиїв','динамокиев'],
 'juventus':['ювентус'], 'pardubice':['пардубіце','пардубице'],
 'realmadrid':['реалмадрид'], 'arsenal':['арсенал'], 'chelsea':['челсі','челси'],
 'liverpool':['ліверпуль','ливерпуль'], 'polissya':['полісся','полесье'],
}

def bare_name(value):
    value=unicodedata.normalize('NFKD',str(value).lower().replace('ø','o'))
    value=''.join(c for c in value if not unicodedata.combining(c))
    value=re.sub(r'\b(?:fc|cf|fk|фк)\b','',value)
    return re.sub(r'[^a-zа-яіїєґ0-9]','',value)

ALIASES={bare_name(alias):key for key,aliases in TEAM_GROUPS.items() for alias in [key]+aliases}
def team_key(value):return ALIASES.get(bare_name(value),bare_name(value))

def teams(title):
    title=re.sub(r'[\U0001F000-\U0001FFFF\U000e0000-\U000e007f\u2600-\u27ff\ufe0f]','',str(title)).strip()
    title=title.rsplit(' : ',1)[-1]
    parts=re.split(r'\s+(?:[–—-]|vs\.?|v\.)\s+',title,maxsplit=1,flags=re.I)
    return (parts[0].strip(),parts[1].strip()) if len(parts)==2 else ('','')

def identities(item):
    h,a=(item.get('home'),item.get('away')) if item.get('home') and item.get('away') else teams(item.get('title',''))
    if h and a:item.update(home=h,away=a,home_key=team_key(h),away_key=team_key(a))
    return item

SPORTS=[('football',r'football|soccer|футбол|champions league|europa league|conference league'),
        ('basketball',r'basketball|баскетбол|nba|wnba'),('hockey',r'hockey|хок[еє]й|nhl'),
        ('tennis',r'tennis|теніс|теннис'),('motorsport',r'motor|formula|moto|racing|nascar|f1\b'),
        ('combat',r'boxing|mma|ufc|wrestling|бокс'),('volleyball',r'volleyball|волейбол')]
def sport_key(value):
    text=str(value).lower()
    if 'american football' in text or 'ncaaf' in text or text=='nfl':return 'american_football'
    for icon,key in [('⚽','football'),('🏀','basketball'),('🏒','hockey'),('🎾','tennis'),('🏎','motorsport'),('🏍','motorsport'),('🥊','combat'),('🏐','volleyball')]:
        if icon in text:return key
    # An explicit sport takes precedence over a shared competition label such
    # as Basketball Champions League. UEFA names alone remain football hints.
    for key,pattern in SPORTS[1:]:
        if re.search(pattern,text):return key
    return next((key for key,pattern in SPORTS if re.search(pattern,text)), 'other')

def iso(value):
    if isinstance(value,(int,float)):
        if value>10**12:value/=1000
        return datetime.fromtimestamp(value,timezone.utc).isoformat().replace('+00:00','Z') if value>0 else ''
    try:
        parsed=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        return parsed.astimezone(timezone.utc).isoformat().replace('+00:00','Z') if parsed.tzinfo else ''
    except (ValueError,TypeError):return ''

def safe_reference(url):
    p=urlsplit(str(url or ''))
    return p.scheme=='https' and bool(p.hostname) and not p.username and not p.password and not p.query and not p.fragment

def p2p_links(html,event_id):
    parser=HrefParser();parser.feed(html.decode('utf-8','replace') if isinstance(html,bytes) else html)
    result=[];seen=set()
    for ref in parser.links:
        content='';kind=''
        if ref.lower().startswith('acestream://'):kind='acestream';content=ref[12:]
        else:
            p=urlsplit(ref);q=parse_qs(p.query)
            if p.path=='/webplayer2.php' and q.get('t')==['acestream'] and q.get('eid')==[str(event_id)]:
                kind='acestream';content=q.get('c',[''])[0]
            elif ref.lower().startswith('sop://') and re.fullmatch(r'sop://[A-Za-z0-9.-]+(?::\d{1,5})?/\d{1,14}',ref):
                kind='sopcast';content=ref
        if kind=='acestream' and not re.fullmatch(r'[a-fA-F0-9]{40}',content):continue
        if kind and (kind,content.lower()) not in seen:
            seen.add((kind,content.lower()));result.append({'kind':kind,'provider':'livetv','id':content.lower(),
                'event_id':str(event_id),'title':'LiveTV · '+('AceStream' if kind=='acestream' else 'SopCast'),
                'requires_bridge':True,'verified':False})
    return result[:30]

class HrefParser(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a':self.links.append(dict(attrs).get('href',''))

def parse_ppv(data,now):
    if not isinstance(data,dict) or data.get('success') is not True or not isinstance(data.get('streams'),list):raise ValueError('PPV schema')
    events=[];channels=[]
    for category in data['streams']:
        for item in category.get('streams',[]):
            if not isinstance(item,dict) or not str(item.get('id','')).isdigit():continue
            target=item.get('iframe','')
            if not safe_reference(target):continue
            ident=str(item['id']);title=str(item.get('name') or '').strip()[:180]
            if not title:continue
            source={'provider':'ppv','kind':'provider','id':ident,'title':'PPV · '+str(item.get('source_tag') or 'джерело')[:80], 'requires_bridge':True,'verified':False}
            start=iso(item.get('starts_at'));end=iso(item.get('ends_at'))
            event={'id':'ppv:'+ident,'provider':'ppv','title':title,'sport':sport_key(category.get('category','')),
                'competition':str(item.get('tag') or '')[:100],'kickoff':start,'ends_at':end,
                'sources':[source],'checked_at':now.isoformat().replace('+00:00','Z'),'status':'scheduled'}
            if item.get('always_live') or not start:
                event['is_channel']=True;channels.append(event);continue
            dt=datetime.fromisoformat(start.replace('Z','+00:00'))
            ending=datetime.fromisoformat(end.replace('Z','+00:00')) if end else dt+timedelta(hours=5)
            if ending<now or dt>now+timedelta(days=14):continue
            if dt<=now<=ending:event['status']='live'
            events.append(identities(event))
    return events,channels

class DaddySchedule(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.day=None;self.current=None;self.events=[];self.capture=None;self.buffer=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs);classes=d.get('class','').split();self.stack.append((tag,classes))
        if 'schedule__event' in classes:self.current={'title':'','time':'','sources':[],'depth':len(self.stack),'day':self.day}
        for cls,field in [('schedule__dayTitle','day'),('schedule__eventTitle','title'),('schedule__time','time')]:
            if cls in classes:self.capture=(field,len(self.stack));self.buffer=[]
        if tag=='a' and self.current:
            p=urlsplit(d.get('href',''));q=parse_qs(p.query);ident=''
            if not p.netloc and p.path=='/watch.php':ident=q.get('id',[''])[0]
            if not p.netloc and re.fullmatch(r'/(?:stream|watch|cast)/stream-\d+\.php',p.path):ident=re.search(r'(\d+)\.php',p.path).group(1)
            if re.fullmatch(r'\d{1,12}',ident):
                self.current['sources'].append({'provider':'daddy','kind':'provider','id':ident,
                    'title':'DaddyLive · '+str(d.get('title') or d.get('data-ch') or ident)[:80],
                    'requires_bridge':True,'verified':False})
        if tag in ('img','input','br','hr','meta','link','source','wbr'):self.stack.pop()
    def handle_data(self,text):
        if self.capture:self.buffer.append(text)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in ('img','input','br','hr','meta','link','source','wbr'):self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if self.capture and len(self.stack)==self.capture[1]:
            field=self.capture[0];text=' '.join(''.join(self.buffer).split());self.capture=None
            if field=='day':
                match=re.search(r'(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*\s+(20\d{2})',text)
                if match:
                    try:self.day=datetime.strptime(' '.join(match.groups()),'%d %b %Y').date()
                    except ValueError:self.day=None
            elif self.current:self.current[field]=text
        if self.current and len(self.stack)==self.current['depth']:
            self.events.append(self.current);self.current=None
        if self.stack:self.stack.pop()

def parse_daddy(html,now):
    p=DaddySchedule();p.feed(html.decode('utf-8','replace') if isinstance(html,bytes) else html);result=[]
    for item in p.events:
        if not item['day'] or not re.fullmatch(r'\d{2}:\d{2}',item['time']) or not item['title'] or not item['sources']:continue
        dt=datetime.fromisoformat(item['day'].isoformat()+'T'+item['time']+':00+00:00')
        if dt<now-timedelta(hours=5) or dt>now+timedelta(days=14):continue
        title=item['title'];sport=sport_key(title)
        if '📺' in title:continue
        # Reject a plainly contradictory single date in the advertised title.
        # Multi-day tournament ranges are kept; their schedule date is valid.
        months=r'January|February|March|April|May|June|July|August|September|October|November|December'
        if len(re.findall(months,title,re.I))==1:
            named=re.search(r'(\d{1,2})\s+('+months+r')\s+(20\d{2})',title,re.I)
            american=re.search(r'('+months+r')\s+(\d{1,2}),?\s+(20\d{2})',title,re.I)
            try:
                advertised=datetime.strptime(named.group(0),'%d %B %Y').date() if named else datetime.strptime(re.sub(',','',american.group(0)),'%B %d %Y').date() if american else None
                if advertised and advertised!=item['day']:continue
            except ValueError:continue
        competition=title.split(' : ',1)[0].strip(' ⚽🏀🏒🎾🏎️') if ' : ' in title else ''
        h,a=teams(title)
        clean=(h+' — '+a) if h and a else title
        ident=hashlib.sha256((dt.isoformat()+title).encode()).hexdigest()[:16]
        unique={s['id']:s for s in item['sources']}
        result.append(identities({'id':'daddy:'+ident,'provider':'daddy','title':clean,'competition':competition,
            'sport':sport,'kickoff':iso(dt.isoformat()),'status':'live' if dt<=now else 'scheduled',
            'sources':list(unique.values())[:40],'checked_at':iso(now.isoformat())}))
    return result,[]

def parse_tim(data,now):
    if not isinstance(data,dict) or 'events' not in data:raise ValueError('TimStreams schema')
    raw=data['events']
    if raw is None:return [],[]
    if isinstance(raw,dict):raw=[x for items in raw.values() for x in (items if isinstance(items,list) else [])]
    if not isinstance(raw,list):raise ValueError('TimStreams events schema')
    genres={str(x.get('id')):x.get('name','') for x in data.get('genres',[]) if isinstance(x,dict)}
    result=[]
    for item in raw:
        if not isinstance(item,dict) or item.get('vip'):continue
        ident=str(item.get('url') or item.get('slug') or item.get('id') or '')
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,180}',ident):continue
        title=str(item.get('name') or item.get('title') or '').strip()[:180]
        stamp=iso(item.get('time') or item.get('starts_at') or item.get('start'))
        if not title or not stamp:continue
        dt=datetime.fromisoformat(stamp.replace('Z','+00:00'))
        if not now-timedelta(hours=5)<=dt<=now+timedelta(days=14):continue
        result.append(identities({'id':'tim:'+ident,'provider':'tim','title':title,'kickoff':stamp,
            'sport':sport_key(genres.get(str(item.get('genre')),'')),'competition':str(item.get('description') or '')[:100],
            'status':'live' if dt<=now else 'scheduled','checked_at':iso(now.isoformat()),
            'sources':[{'provider':'tim','kind':'provider','id':ident,'title':'TimStreams','requires_bridge':True,'verified':False}]}))
    return result,[]

def parse_pit(data,now):
    if not isinstance(data,dict) or data.get('ok') is not True or not isinstance(data.get('data'),dict):raise ValueError('PitSport schema')
    result=[]
    for group in ('live','upcoming'):
        for item in data['data'].get(group,[]):
            ident=str(item.get('programId') or '')
            title=str(item.get('titleText') or '')[:180];stamp=iso(item.get('sessionStart'))
            if not ident.isdigit() or not title or not stamp:continue
            dt=datetime.fromisoformat(stamp.replace('Z','+00:00'))
            if not now-timedelta(hours=5)<=dt<=now+timedelta(days=14):continue
            competition=str(item.get('footer') or '')[:100]
            result.append(identities({'id':'pit:'+ident,'provider':'pit','title':title,
                'sport':sport_key(competition+' '+str(item.get('competitionSlug') or '')),
                'competition':competition,'kickoff':stamp,'status':'live' if group=='live' else 'scheduled',
                'checked_at':iso(now.isoformat()),'sources':[
                    {'provider':'pit','kind':'provider','id':ident,'title':'PitSport',
                     'requires_bridge':True,'verified':False}] if item.get('hasVideo') else []}))
    return result,[]


def fetch_extra(get_url,now):
    jobs={'daddy':('https://thedaddy.pk/',parse_daddy),'ppv':('https://api.ppv.st/api/streams',parse_ppv),
          'tim':('https://tim-streams.com/api/live-upcoming',parse_tim),
          'pit':('https://pitsport.st/api/v1/live-now',parse_pit)}
    events=[];channels=[];health={}
    def one(provider):
        url,parse=jobs[provider]
        try:
            raw=get_url(url,6_000_000);data=json.loads(raw) if provider!='daddy' else raw
            found,chan=parse(data,now)
            return provider,found,chan,{'status':'ok' if found or chan else 'empty','events':len(found),'channels':len(chan),'checked_at':iso(now.isoformat())}
        except Exception as exc:return provider,[],[],{'status':'error','error_type':type(exc).__name__,'events':0,'channels':0}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for provider,found,chan,state in pool.map(one,jobs):events.extend(found);channels.extend(chan);health[provider]=state
    return events,channels,health

def matches(a,b):
    identities(a);identities(b)
    if a.get('sport') and b.get('sport') and a['sport']!=b['sport']:return False
    if not a.get('home_key') or not b.get('home_key'):return False
    if (a['home_key'],a['away_key'])!=(b['home_key'],b['away_key']):return False
    x=iso(a.get('kickoff'));y=iso(b.get('kickoff'))
    return not (x and y) or abs((datetime.fromisoformat(x.replace('Z','+00:00'))-datetime.fromisoformat(y.replace('Z','+00:00'))).total_seconds())<=10800

def add_livetv(events,now=None):
    now=now or datetime.now(timezone.utc)
    result=[]
    for original in events:
        item=dict(original);item['id']='livetv:'+str(original['id']);item['provider']='livetv'
        start=iso(item.get('kickoff'));end=iso(item.get('ends_at'))
        if start:
            dt=datetime.fromisoformat(start.replace('Z','+00:00'))
            ending=datetime.fromisoformat(end.replace('Z','+00:00')) if end else dt+timedelta(hours=5)
            item['status']='finished' if ending<now else 'live' if dt<=now else 'scheduled'
        sources=[]
        for p in original.get('players',[]):
            if p.get('kind')!='embed':continue
            q=parse_qs(urlsplit(p.get('url','')).query)
            if q.get('eid')!=[str(original['id'])]:continue
            sources.append({'kind':'provider','provider':'livetv','id':q.get('lid',[''])[0],
                'event_id':str(original['id']),'channel':q.get('c',[''])[0],'type':q.get('t',[''])[0],
                'title':p.get('title','LiveTV'),'requires_bridge':True,'verified':False})
        item['sources']=sources+original.get('p2p',[])
        result.append(identities(item))
    return result
