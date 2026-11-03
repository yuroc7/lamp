'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','y7_sport.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'..','y7_game.js'),'utf8');
let now=Date.parse('2026-11-04T12:00:00Z'),nextTimer=1,opened=false,aquariums=0,menus=0;
const timers=new Map(),listeners={},components={},playerListeners={},frames=[],events=[];
class ClockDate extends Date {static now(){return now;}}
function advance(ms){const end=now+ms;while(now<end){now=Math.min(now+1000,end);for(const t of [...timers.values()])if(now>=t.next){t.next+=t.ms;t.fn();}}}
function node(){return {src:'',attrs:{},removed:false,setAttribute(k,v){this.attrs[k]=v;},remove(){this.removed=true;}};}
function jq(){const q={0:node(),jquery:true,length:1};for(const key of ['append','empty','text','attr','addClass','removeClass','on','off','css','remove','trigger'])q[key]=()=>q;q.find=()=>jq();q.first=()=>q;return q;}
const document={hidden:false,querySelector(){return null;},querySelectorAll(){return [];},getElementById(){return {};},
 addEventListener(k,fn){(listeners[k]||=[]).push(fn);},removeEventListener(){},
 createEvent(){return {initEvent(type){this.type=type;}};},dispatchEvent(e){events.push(e.type);for(const fn of listeners[e.type]||[])fn(e);},
 createElement(type){const n=node();if(type==='iframe')frames.push(n);return n;}};
const Lampa={Component:{add(k,fn){components[k]=fn;}},Menu:{addButton(){menus++;return jq();}},Head:{addIcon(){return jq();}},
 Storage:{get(){return null;},set(){}},Noty:{show(){}},Activity:{push(){},backward(){}},
 Controller:{remove(){},add(){},toggle(){},collectionSet(){},collectionFocus(){}},Scroll:function(){},Modal:{opened(){return false;}},
 Player:{opened(){return opened;},play(data){this.last=data;},listener:{follow(k,fn){(playerListeners[k]||=[]).push(fn);}}}};
const globals={window:{Lampa,jQuery:{}},document,Lampa,navigator:{},URL,Date:ClockDate,$:jq,
 setInterval(fn,ms){const id=nextTimer++;timers.set(id,{fn,ms,next:now+ms});return id;},clearInterval(id){timers.delete(id);},setTimeout(){return 0;},clearTimeout(){}};
let pendingResolve,releases=0;
globals.navigator.wakeLock={request(){return new Promise(resolve=>{pendingResolve=resolve;});}};
const testExports=`window.test={SafeTabs:SafeTabs,LivePlayer:LivePlayer,sportSetWatching:sportSetWatching,sportOwner:sportOwner,
 addTab:function(){SAFE_TABS.push({url:'https://livetv.sx/ua/',title:'LiveTV'});},
 setPlayer:function(){playerRequest={title:'Match',choices:[{kind:'embed',url:'https://livetv.sx/webplayer2.php?t=tvope&c=23&eid=123&lid=77'}]};},
 setMemory:function(value){memory=value;},freshChannel:freshChannel,isPlayer:isPlayer,playStream:playStream,playOfficial:playOfficial,filterFixtures:filterFixtures};`;
vm.runInNewContext(source.replace('    boot();',testExports+' boot();'),globals);
assert.equal(globals.window.Y7Sport.version,'1.1.7');
assert.equal(menus,1);
vm.runInNewContext(source,globals);assert.equal(menus,1,'double include');
const gStart=game.indexOf('    var Y7_IDLE_LAST='),gEnd=game.indexOf('    function installGamesHeadIcon',gStart);
globals.readState=()=>({screensaver:true,screensaver_minutes:5});globals.openAquarium=()=>aquariums++;
vm.runInNewContext(game.slice(gStart,gEnd)+'window.kids={tick:idleTick,install:installIdleAquarium};',globals);
const t=globals.window.test,kids=globals.window.kids;kids.install();
function make(Type){const v=new Type();v.activity={loader(){}};v.create();return v;}
t.addTab();const tabs=make(t.SafeTabs);tabs.start();
advance(12*60000);assert.equal(aquariums,0,'cross-origin viewer prevents aquarium beyond 5m');
assert.equal(globals.window.__Y7_SPORT_WATCHING__,true);
assert.equal(frames.at(-1).attrs.sandbox,'allow-scripts allow-same-origin allow-forms allow-presentation');
assert.ok(!events.includes('pointermove'),'no synthetic input');
tabs.pause();assert.equal(globals.window.__Y7_SPORT_WATCHING__,false);assert.equal(frames.at(-1).removed,true);
advance(299000);assert.equal(aquariums,0,'full idle timeout after pause');advance(11000);assert.equal(aquariums,1);
tabs.start();assert.equal(globals.window.Y7Sport.isWatching(),true);assert.equal(frames.at(-1).removed,false,'resumed iframe recreated');
const newer=make(t.SafeTabs);newer.start();tabs.destroy();assert.equal(globals.window.Y7Sport.isWatching(),true,'old destroy cannot clear new owner');newer.destroy();
assert.equal(globals.window.__Y7_SPORT_WATCHING__,false);
t.setPlayer();const player=make(t.LivePlayer);player.start();advance(6*60000);assert.equal(aquariums,1);
player.pause();assert.equal(globals.window.__Y7_SPORT_WATCHING__,false);player.start();assert.equal(globals.window.__Y7_SPORT_WATCHING__,true);
document.hidden=true;document.dispatchEvent({type:'visibilitychange'});assert.equal(globals.window.__Y7_SPORT_WATCHING__,false);
document.hidden=false;document.dispatchEvent({type:'visibilitychange'});assert.equal(globals.window.__Y7_SPORT_WATCHING__,true);
player.back();player.destroy();assert.equal(globals.window.Y7Sport.isWatching(),false);
opened=true;advance(10*60000);assert.equal(aquariums,1,'native Lampa player also suppresses idle');
opened=false;for(const fn of playerListeners.close||[])fn();advance(299000);assert.equal(aquariums,1);advance(11000);assert.equal(aquariums,2);
globals.window.__Y7_SPORT_WATCHING__=true;globals.window.__Y7_SPORT_WATCHING_AT__=now-61000;
advance(5*60000);assert.ok(aquariums>2,'expired abandoned heartbeat cannot suppress forever');
assert.equal(t.isPlayer({kind:'direct',url:'https://cdn.example/a.m3u8'}),false);
assert.equal(t.isPlayer({kind:'embed',url:'https://ads.example/export/player.php'}),false);
assert.equal(t.isPlayer({kind:'embed',url:'https://gw-suspilne-sport.cosmonova-broadcast.tv/player'}),true);
const channel={id:'x',content_id:'same-event',authorized:true,verified:true,url:'https://cdn.example/a.m3u8',checked_at:new ClockDate(now).toISOString(),health:{segment_checked:true}};
assert.equal(t.freshChannel(channel),true);assert.equal(t.freshChannel({...channel,checked_at:undefined}),false);
assert.equal(t.freshChannel({...channel,checked_at:new ClockDate(now-1801000).toISOString()}),false);
const reserve={...channel,url:'https://cdn.example/b.m3u8'};t.setMemory({channels:[channel,reserve]});t.playStream(channel.url,'Match');
assert.equal(Lampa.Player.last.launch_player,'inner');let next='';Lampa.Player.last.error({},url=>next=url);assert.equal(next,reserve.url);
t.playOfficial({kind:'youtube',status:'live',url:'https://www.youtube.com/watch?v=abcdefghijk',title:'Official',checked_at:new ClockDate(now).toISOString()});
assert.equal(Lampa.Player.last.url,'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(t.filterFixtures({fixtures:[{kickoff:'2026-11-03T17:45:00Z',status:'scheduled',important:true}]},'ua').length,0,'old cached announcement hidden');
// Run the real unpatched 4.7.1 idle code to exercise the fixed-loader cache path.
const legacyListeners={},legacyTimers=new Map();let legacyAquariums=0,legacySeq=0;
const legacyDoc={...document,addEventListener(k,fn){(legacyListeners[k]||=[]).push(fn);},dispatchEvent(e){for(const fn of legacyListeners[e.type]||[])fn(e);}};
const legacyGlobals={...globals,window:{Lampa,jQuery:{}},document:legacyDoc,navigator:{},openAquarium(){legacyAquariums++;},
 setInterval(fn,ms){const id=++legacySeq;legacyTimers.set(id,{fn,ms,next:now+ms});return id;},clearInterval(id){legacyTimers.delete(id);}};
vm.runInNewContext(source.replace('    boot();',testExports+' boot();'),legacyGlobals);
const legacySource=fs.readFileSync(path.join(__dirname,'fixtures','legacy_idle_471.js'),'utf8');
vm.runInNewContext(legacySource+'installIdleAquarium();',legacyGlobals);
legacyGlobals.window.test.addTab();const oldTabs=make(legacyGlobals.window.test.SafeTabs);oldTabs.start();
function advanceLegacy(ms){for(let i=0;i<ms/10000;i++){now+=10000;for(const item of [...legacyTimers.values()])if(now>=item.next){item.next+=item.ms;item.fn();}}}
advanceLegacy(12*60000);assert.equal(legacyAquariums,0,'old cached Kids stays idle through a 12m viewer');oldTabs.destroy();
advanceLegacy(290000);assert.equal(legacyAquariums,0);advanceLegacy(10000);assert.equal(legacyAquariums,1,'old cached Kids resumes after exit');
// Late wake-lock resolution after viewer destruction must release the lock.
(async()=>{pendingResolve({release(){releases++;return Promise.resolve();}});await Promise.resolve();assert.equal(releases,1);console.log('PASS lifecycle: iframe >5m, pause/resume/back/destroy, owner races, visibility, native close, stale leases, wake lock, native fallback, cached dates');})().catch(e=>{console.error(e);process.exitCode=1;});
