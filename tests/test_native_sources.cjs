'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','y7_sport.js'),'utf8');
const now=Date.parse('2026-11-03T21:00:00Z');class Clock extends Date{constructor(...v){super(...(v.length?v:[now]));}static now(){return now;}}
let pending=[],lastSelect,player,notifications=[],storage={},toggles=[],closeListeners=[];
function node(){return {0:{},length:1,addClass(){return this;},attr(){return this;}};}
function XHR(){pending.push(this);}XHR.prototype.open=function(method,url){this.url=url;};XHR.prototype.setRequestHeader=function(){};
XHR.prototype.send=function(body){this.payload=JSON.parse(body);};XHR.prototype.respond=function(obj){this.readyState=4;this.status=obj.ok?200:422;this.responseText=JSON.stringify(obj);this.onreadystatechange();};
const Lampa={Component:{add(){}},Activity:{push(){}},Scroll:function(){},Menu:{addButton:node},Head:{addIcon:node},
 Storage:{get(k,d){return storage[k]===undefined?d:storage[k];},set(k,v){storage[k]=v;}},Noty:{show(s){notifications.push(s);}},
 Select:{show(s){lastSelect=s;},close(){}},Controller:{toggle(s){toggles.push(s);}},
 Player:{play(s){player=s;},listener:{follow(k,fn){if(k==='close')closeListeners.push(fn);}}}};
const document={hidden:false,querySelector(){return null;},createEvent(){return {initEvent(){}};},dispatchEvent(){},addEventListener(){}};
const g={window:{Lampa,jQuery:{}},Lampa,document,navigator:{},URL,Date:Clock,$:node,XMLHttpRequest:XHR,
 setTimeout(){},setInterval(){return 1;},clearInterval(){}};
const testExports='window.test={sameMatch,sourcesFor,displayEvents,matchSources,playBridge,cancelBridge,bridgeBase};';
vm.runInNewContext(source.replace('    boot();',testExports+'    boot();'),g);const t=g.window.test;
const fixture={id:'uefa:1',home:'Barcelona',away:'Aston Villa',home_key:'barcelona',away_key:'astonvilla',kickoff:'2026-11-03T20:00:00Z',status:'live'};
const event={...fixture,id:'pit:1',provider:'pit',sport:'football',title:'Barcelona — Aston Villa',sources:[{provider:'pit',kind:'provider',id:'1',title:'PitSport'}]};
const live={...event,id:'livetv:2',provider:'livetv',kickoff:undefined,status:undefined,sources:[{provider:'livetv',kind:'acestream',id:'a'.repeat(40)}]};
const feed={events:[live,event],fixtures:[fixture]};
assert.equal(t.sourcesFor(fixture,feed).length,2,'UEFA source matching works without livetv_url');
assert.equal(t.sourcesFor({...fixture,status:'finished'},feed).length,0,'finished matches cannot play stale source lists');
assert.equal(t.sameMatch(event,{...event,id:'other',home_key:'barcelonau19'}),false);
assert.equal(t.sameMatch(event,{...event,id:'other',kickoff:'2026-11-04T20:00:00Z'}),false);
assert.equal(t.displayEvents(feed,'live','all','').length,1,'one match, enriched live status across providers');
storage.y7_sport_disabled_sources=['pit'];assert.equal(t.sourcesFor(fixture,feed).length,1);storage.y7_sport_disabled_sources=[];
t.matchSources(fixture,feed);assert.equal(lastSelect.items.length,3);assert.ok(lastSelect.items.every(x=>!/uefa\.tv|мовника|iframe/i.test(x.title)),'source menu has no unrelated site fallback');
assert.equal(t.bridgeBase('http://10.2.4.44:9122/'),'http://10.2.4.44:9122');assert.equal(t.bridgeBase('https://host/?key=private'),'');
t.playBridge(event.title,event.sources);assert.equal(pending.length,0,'unconfigured server does not send credentials or launch HTML');
storage.y7_sport_bridge_key='test-only-'+'x'.repeat(40);
t.playBridge(event.title,event.sources);const first=pending.at(-1);assert.equal(first.url,'http://10.2.4.44:9122/api/resolve');
lastSelect.onSelect(lastSelect.items[0]);first.respond({ok:true,transport_checked:true,path:'/media/'+'a'.repeat(32)+'/index.m3u8',session_id:'a'.repeat(32)});
assert.equal(player,undefined,'late response after cancellation must not open a player');assert.ok(pending.some(x=>x.url.endsWith('/api/stop')),'late session stopped');
t.playBridge(event.title,event.sources);pending.at(-1).respond({ok:true,transport_checked:true,path:'https://ads.example/player',session_id:'bad'});assert.equal(player,undefined,'arbitrary iframe/URL never reaches Player');
t.playBridge(event.title,event.sources);pending.at(-1).respond({ok:true,transport_checked:true,path:'/media/'+'b'.repeat(32)+'/index.m3u8',session_id:'b'.repeat(32)});
assert.equal(player.launch_player,'inner');assert.ok(player.url.endsWith('/index.m3u8'));assert.equal(g.window.__Y7_SPORT_WATCHING__,true);
closeListeners.forEach(fn=>fn());assert.equal(g.window.__Y7_SPORT_WATCHING__,false);assert.ok(pending.at(-1).url.endsWith('/api/stop'));
console.log('PASS native sources: matching, grouping, filters, no ad-page fallback, cancellation, opaque HLS, session stop');
