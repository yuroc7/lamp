import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, date, timezone, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('feed',ROOT/'scripts/update_y7_sport_feed.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
import sport_streams as streams
NOW=datetime(2026,11,4,0,0,tzinfo=timezone.utc)

def event(ident='42',status='UPCOMING',league='1',code='UCL'):
    return {'id':ident,'competition':{'id':league,'code':code},'seasonYear':'2027',
            'homeTeam':{'internationalName':'FC Shakhtar Donetsk','countryCode':'UKR'},
            'awayTeam':{'internationalName':'Sporting CP','countryCode':'POR'},
            'status':status,'kickOffTime':{'dateTime':'2026-11-03T17:45:00Z'}}

def fixture(league='ucl',status='scheduled',kickoff='2026-11-03T17:45:00Z'):
    return {'id':'f-'+league,'league':league,'home':'Shakhtar','away':'Sporting','kickoff':kickoff,'status':status,'important':True}

class CalendarTests(unittest.TestCase):
    def test_uefa_match_status_country_score_and_source(self):
        e=event(status='FINISHED');e['score']={'total':{'home':0,'away':1}}
        f=m.event_from_uefa(e,'uefa.champions',2027)
        self.assertTrue(f['important']);self.assertEqual(f['status'],'finished');self.assertEqual(f['score'],'0 : 1')
        self.assertEqual(f['source'],'UEFA');self.assertIn('match/42/',f['source_url'])
    def test_wrong_competition_or_season_rejected(self):
        for obj in (event(league='2014',code='UNL'),dict(event(),seasonYear='2025')):
            with self.assertRaises(ValueError):m.event_from_uefa(obj,'uefa.champions',2027)
    def test_undrawn_and_untimed_not_invented(self):
        e=event();e['homeTeam']['isPlaceHolder']=True
        self.assertIsNone(m.event_from_uefa(e,'uefa.champions',2027))
        e=event();e['kickOffTime']={}
        self.assertIsNone(m.event_from_uefa(e,'uefa.champions',2027))
    def test_pagination_retains_more_than_90(self):
        pages=[[event(str(i)) for i in range(100)],[event('100')]]
        with patch.object(m,'get_url',side_effect=[json.dumps(x).encode() for x in pages]) as get:
            got=m.fetch_uefa('uefa.champions',date(2026,11,2),date(2027,6,30))
        self.assertEqual(len(got),101);self.assertIn('offset=100',get.call_args.args[0])
    def test_repeated_page_does_not_claim_complete(self):
        page=[event(str(i)) for i in range(100)]
        with patch.object(m,'get_url',return_value=json.dumps(page).encode()):
            with self.assertRaises(ValueError):m.fetch_uefa('uefa.champions',date(2026,11,2),date(2027,6,30))
    def test_never_reinject_featured_historical_match(self):
        self.assertEqual(m.merge_fixtures([],date(2026,11,4)),[])
        self.assertEqual(m.merge_fixtures([],date(2026,11,3)),[])
    def test_dedupe_does_not_collapse_different_clubs(self):
        a=fixture();b=dict(a,home='Dynamo Kyiv')
        self.assertEqual(len(m.merge_fixtures([a,a,b],date(2026,11,3))),2)
    def test_cache_is_per_league_and_does_not_renew_age(self):
        old={'updated_at':NOW.isoformat(),'fixtures':[dict(fixture('uecl'),checked_at=(NOW-timedelta(hours=1)).isoformat())]}
        def provider(slug,*args):
            if slug=='uefa.europa.conf':raise OSError('offline')
            return [fixture(m.LEAGUES[slug][0])]
        with patch.object(m,'load_old',return_value=old),patch.object(m,'validated_channels',return_value=[]):
            data=m.build(NOW,provider,lambda:([],[]),lambda:[],lambda now:[])
        cached=next(x for x in data['fixtures'] if x['league']=='uecl')
        self.assertTrue(cached['stale']);self.assertEqual(cached['checked_at'],'2026-11-03T23:00:00Z')
        self.assertEqual(data['health']['fixtures_ok'],2);self.assertTrue(data['health']['fixtures_fallback'])
        self.assertTrue(all(x['status']=='unknown' for x in data['fixtures']))
    def test_expired_cache_is_removed_during_total_outage(self):
        old={'updated_at':(NOW-timedelta(days=3)).isoformat(),'fixtures':[fixture()],'livetv':[]}
        def fail(*args):raise OSError('offline')
        with patch.object(m,'load_old',return_value=old),patch.object(m,'validated_channels',return_value=[]):
            data=m.build(NOW,fail,lambda:([],['offline']),lambda:[],lambda now:[])
        self.assertEqual(data['fixtures'],[]);self.assertEqual(data['health']['fixtures_ok'],0)

class LiveTVTests(unittest.TestCase):
    url='https://livetv.sx/ua/eventinfo/123_match/'
    def test_real_webplayer_href_discovered_without_js_execution(self):
        html='<a href="/webplayer2.php?t=alieztv&amp;c=232749&amp;lang=ua&amp;eid=123&amp;lid=77&amp;ci=7&amp;si=1" onclick="window.open(this.href)">Play</a>'
        got=m.extract_public_players(html,self.url)
        self.assertEqual(len(got),1);self.assertEqual(got[0]['kind'],'embed');self.assertFalse(got[0]['verified'])
        self.assertIn('eid=123',got[0]['url'])
        self.assertEqual(m.extract_public_players(html,self.url.replace('123','456')),[])
    def test_generic_ad_wrong_event_and_acestream_are_not_players(self):
        html='''<iframe src="https://livetv.sx/export/webplayer.iframe.php"></iframe>
          <a href="https://ad.example/webplayer2.php?t=tvope&c=23&eid=123&lid=77">ad</a>
          <a href="/webplayer2.php?t=acestream&c=abc&eid=123&lid=77">ace</a>
          <a href="/webplayer2.php?t=tvope&c=23&eid=456&lid=77">wrong</a>'''
        self.assertEqual(m.extract_public_players(html,self.url),[])
    def test_duplicate_href_dedup_and_secret_urls_not_published(self):
        a='<a href="/webplayer2.php?t=tvope&c=23&eid=123&lid=77">play</a>'
        html=a+a+'<video src="https://cdn.example/a.m3u8?token=secret"></video>'
        self.assertEqual(len(m.extract_public_players(html,self.url)),1)
    def test_unverified_direct_is_discovery_only(self):
        got=m.extract_public_players('<video src="https://cdn.example/a.m3u8"></video>',self.url)
        self.assertEqual(got[0]['kind'],'direct');self.assertFalse(got[0]['verified']);self.assertNotIn('authorized',got[0])

class OfficialLiveTests(unittest.TestCase):
    def document(self,**changes):
        data={'playabilityStatus':{'status':'OK','playableInEmbed':True},
              'videoDetails':{'videoId':'abcdefghijk','channelId':m.YOUTUBE_CHANNELS[-1][2],'title':'Official live'},
              'microformat':{'playerMicroformatRenderer':{'liveBroadcastDetails':{'isLiveNow':True}}},
              'streamingData':{'hlsManifestUrl':'https://private.example/a.m3u8?token=secret'}}
        data.update(changes);return 'var ytInitialPlayerResponse = '+json.dumps(data)+';'
    def test_official_live_exports_only_watch_url(self):
        result=m.youtube_live_from_html(self.document(),m.YOUTUBE_CHANNELS[-1],NOW)
        self.assertEqual(result['kind'],'youtube');self.assertEqual(result['status'],'live')
        self.assertNotIn('secret',json.dumps(result));self.assertNotIn('hls',result['url'])
    def test_wrong_channel_not_live_not_embeddable_or_paid_rejected(self):
        for changes in ({'videoDetails':{'videoId':'abcdefghijk','channelId':'fake'}},
                        {'microformat':{}},{'playabilityStatus':{'status':'LOGIN_REQUIRED','playableInEmbed':True}},
                        {'playabilityStatus':{'status':'OK','playableInEmbed':False}}):
            self.assertIsNone(m.youtube_live_from_html(self.document(**changes),m.YOUTUBE_CHANNELS[-1],NOW))

class StreamTests(unittest.TestCase):
    def test_private_token_urls_rejected(self):
        for u in ('http://cdn.example/a.m3u8','https://127.0.0.1/a.m3u8','https://[::1]/a.m3u8','https://cdn.example/a.m3u8?token=abc','https://user:secret@cdn.example/a.m3u8','https://tv.local/a.m3u8'):
            with self.subTest(url=u),self.assertRaises(ValueError):streams.public_url(u)
    def test_real_hls_needs_variant_and_media_bytes(self):
        ts=b'\x47'+b'\0'*187+b'\x47'+b'\0'*187
        responses=[('https://cdn.example/master.m3u8','application/x-mpegurl',b'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,CODECS="avc1.42E01E,mp4a.40.2"\nlow.m3u8\n'),
                   ('https://cdn.example/low.m3u8','application/x-mpegurl',b'#EXTM3U\n#EXTINF:6,\na.ts\n'),
                   ('https://cdn.example/a.ts','video/mp2t',ts)]
        def fetch(url,*args):return responses.pop(0)
        result=streams.check_media('https://cdn.example/master.m3u8',fetch)
        self.assertTrue(result['segment_checked']);self.assertFalse(result['lg_tested']);self.assertEqual(len(responses),0)
    def test_html_drm_and_empty_playlist_rejected(self):
        for mime,body in [('text/html',b'<html>not video</html>'),('application/x-mpegurl',b'#EXTM3U\n'),
                          ('application/x-mpegurl',b'#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="x"\na.ts')]:
            def fetch(*args):return 'https://cdn.example/a.m3u8',mime,body
            with self.assertRaises(ValueError):streams.check_media('https://cdn.example/a.m3u8',fetch)
    def test_manifest_without_actual_segment_is_not_verified(self):
        replies=[('https://cdn.example/a.m3u8','application/x-mpegurl',b'#EXTM3U\n#EXTINF:6,\na.ts'),
                 ('https://cdn.example/a.ts','text/html',b'<html>denied</html>')]
        with self.assertRaises(ValueError):streams.check_media('https://cdn.example/a.m3u8',lambda *a:replies.pop(0))
    def test_authorized_requires_evidence_and_probe(self):
        item={'id':'x','title':'Licensed','authorized':True,'url':'https://cdn.example/a.mp4','source_page':'https://broadcaster.example/live','rights_note':'User authorized public stream'}
        result=streams.validate_channel(item,NOW,lambda u:{'segment_checked':True})
        self.assertTrue(result['verified']);self.assertNotIn('token',json.dumps(result))
        with self.assertRaises(ValueError):streams.validate_channel(dict(item,rights_note=''),NOW)
    def test_mp4_structure_checked(self):
        result=streams.check_media('https://cdn.example/a.mp4',lambda *a:('https://cdn.example/a.mp4','video/mp4',b'\x00\x00\x00\x20ftypisom'+b'\0'*20))
        self.assertTrue(result['segment_checked'])

if __name__=='__main__':unittest.main()
