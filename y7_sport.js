/*
 * Y7 SPORT / Football First 1.1.8
 * Separate Lampa / LG webOS extension: no changes to 1.js, Lampac or Y7 Gateway.
 * Uses static, automatically refreshed public match metadata from GitHub Pages.
 * Native playback via the private on-demand bridge; no provider-page fallback.
 * Authorized public direct HLS/MP4/DASH streams may be supplied in sport_channels.json.
 */
(function(){
    'use strict';
    var VERSION='1.1.8',KEY='__Y7_SPORT_FOOTBALL_118__';
    if(window[KEY])return;
    window[KEY]=true;
    var COMPONENT='y7_sport_118',CTRL='y7_sport_118_ctrl';
    var PLAYER_COMPONENT='y7_sport_live_player_118',PLAYER_CTRL='y7_sport_live_player_ctrl_118';
    var SAFE_COMPONENT='y7_sport_safe_tabs_118',SAFE_CTRL='y7_sport_safe_tabs_ctrl_118';
    var SAFE_TABS=[],SAFE_ACTIVE=0;
    var playerRequest=null;
    // Cross-origin playback cannot be inspected. Suspend Kids idle only while
    // an iframe viewer owns an active lease; a stale instance cannot clear another.
    var SPORT_GUARD={owners:{},sequence:0,timer:0,wake:null,pending:false};
    function sportOwner(){return 'viewer-'+(++SPORT_GUARD.sequence);}
    function sportIsWatching(){return Object.keys(SPORT_GUARD.owners).length>0;}
    function sportActivity(){
        window.__Y7_SPORT_WATCHING__=sportIsWatching()&&!document.hidden;
        window.__Y7_SPORT_WATCHING_AT__=Date.now();
        // A dedicated event resets Kids idle on both enter and exit, without
        // synthetic pointer/keyboard input affecting Lampa focus or playback.
        try{var e=document.createEvent('Event');e.initEvent('y7:sport-activity',false,false);document.dispatchEvent(e);}catch(e){}
        // 1.js deliberately keeps its existing game URL. During its HTTP cache
        // lifetime Kids 4.7.1 may still be running: use its passive idle listener
        // until the patched module acknowledges the dedicated protocol.
        if(window.__Y7_KIDS_SPORT_IDLE_PROTOCOL__!==1)try{
            var legacy=document.createEvent('Event');legacy.initEvent('pointermove',true,false);document.dispatchEvent(legacy);
        }catch(e){}
    }
    function sportWakeRelease(){
        var lock=SPORT_GUARD.wake;SPORT_GUARD.wake=null;
        if(lock&&lock.release)try{var p=lock.release();if(p&&p.catch)p.catch(function(){});}catch(e){}
    }
    function sportWakeRequest(){
        if(!sportIsWatching()||document.hidden||SPORT_GUARD.wake||SPORT_GUARD.pending)return;
        try{
            if(!navigator.wakeLock||!navigator.wakeLock.request)return;
            SPORT_GUARD.pending=true;
            navigator.wakeLock.request('screen').then(function(lock){
                SPORT_GUARD.pending=false;
                if(!sportIsWatching()||document.hidden){try{var p=lock.release();if(p&&p.catch)p.catch(function(){});}catch(e){}return;}
                SPORT_GUARD.wake=lock;
                if(lock.addEventListener)lock.addEventListener('release',function(){if(SPORT_GUARD.wake===lock)SPORT_GUARD.wake=null;});
            },function(){SPORT_GUARD.pending=false;});
        }catch(e){SPORT_GUARD.pending=false;}
    }
    function sportSetWatching(owner,active){
        if(active)SPORT_GUARD.owners[owner]=true;else delete SPORT_GUARD.owners[owner];
        sportActivity();
        if(sportIsWatching()){
            sportWakeRequest();
            if(!SPORT_GUARD.timer)SPORT_GUARD.timer=setInterval(function(){sportActivity();sportWakeRequest();},20000);
        }else{
            if(SPORT_GUARD.timer){clearInterval(SPORT_GUARD.timer);SPORT_GUARD.timer=0;}
            sportWakeRelease();
        }
    }
    try{document.addEventListener('visibilitychange',function(){
        sportActivity();if(document.hidden)sportWakeRelease();else sportWakeRequest();
    });}catch(e){}
    var BASE='https://yuroc7.github.io/lamp/';
    var FEED=BASE+'y7_sport_feed.json';
    var STORE='y7_sport_feed_118';
    var ICON='<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3ZM5 7l3 3M19 7l-3 3M6 17l3-2M18 17l-3-2"/></svg>';
    var SERVICES=[
    {
        "id": "suspilne",
        "name": "Суспільне Спорт",
        "category": "ua",
        "cost": "free",
        "url": "https://suspilne.media/sport/schedule/live/",
        "note": "Безкоштовні українські ефіри; права на кожну подію різні."
    },
    {
        "id": "fifaplus",
        "name": "FIFA+",
        "category": "football",
        "cost": "free_limited",
        "url": "https://www.fifa.com/dazn",
        "note": "FIFA+ перейшов на DAZN; безкоштовний футбольний контент, реєстрація та геоправа залежать від події."
    },
    {
        "id": "uefatv",
        "name": "UEFA.tv",
        "category": "football",
        "cost": "free_limited",
        "url": "https://www.uefa.tv/",
        "note": "Футбол, молодіжні турніри та повтори; основна чоловіча ЛЧ наживо недоступна."
    },
    {
        "id": "eurovisionsport",
        "name": "Eurovision Sport",
        "category": "multi",
        "cost": "free_limited",
        "url": "https://eurovisionsport.com/en",
        "note": "Багато видів спорту, частина трансляцій геообмежена."
    },
    {
        "id": "redbull",
        "name": "Red Bull TV",
        "category": "multi",
        "cost": "free",
        "url": "https://www.redbull.tv/en_US",
        "note": "Автоспорт, екстрим і події наживо."
    },
    {
        "id": "worldathletics",
        "name": "World Athletics+",
        "category": "athletics",
        "cost": "free_limited",
        "url": "https://worldathletics.org/watch/plus",
        "note": "Легка атлетика, залежно від геоправ."
    },
    {
        "id": "rugbypass",
        "name": "RugbyPass TV",
        "category": "rugby",
        "cost": "free_limited",
        "url": "https://rugbypass.tv/",
        "note": "Регбі: окремі ефіри, архів; може знадобитися реєстрація."
    },
    {
        "id": "suspilnetv",
        "name": "Суспільне Спорт · телеканал наживо",
        "category": "ua",
        "cost": "free",
        "url": "https://suspilne.media/sport/schedule/tv/",
        "note": "Офіційна сторінка прямого ефіру та розкладу українського телеканалу."
    },
    {
        "id": "allsportdb",
        "name": "AllSportDB Live",
        "category": "schedule",
        "cost": "free",
        "url": "https://live.allsportdb.com/",
        "note": "Розклад спортивних ефірів і офіційні посилання; не власний відеоплеєр."
    },
    {
        "id": "megogo",
        "name": "MEGOGO Футбол",
        "category": "football",
        "cost": "paid",
        "url": "https://megogo.net/ua/sport",
        "note": "Офіційний мовник чоловічої Ліги чемпіонів в Україні за передплатою."
    },
    {
        "id": "uafyt",
        "name": "УАФ · офіційне відео",
        "category": "football",
        "cost": "free_limited",
        "url": "https://www.youtube.com/user/OfficialUkraineFA/streams",
        "note": "Офіційні відкриті ефіри збірних і турнірів УАФ, коли канал їх публікує; не всі матчі."
    },
    {
        "id": "uplyt",
        "name": "UPL TV · офіційне відео",
        "category": "football",
        "cost": "free_limited",
        "url": "https://www.youtube.com/@upltv2023/streams",
        "note": "Огляди й окремі відкриті ефіри; безкоштовність усіх матчів УПЛ не обіцяється."
    },
    {
        "id": "ehftv",
        "name": "EHFTV",
        "category": "handball",
        "cost": "free_limited",
        "url": "https://www.ehftv.com/",
        "note": "Офіційний гандбол EHF; частина контенту безкоштовна, преміальні матчі та геоправа перевіряй окремо."
    },
    {
        "id": "dfb",
        "name": "DFB Play",
        "category": "football",
        "cost": "free_limited",
        "url": "https://www.dfbplay.tv/",
        "note": "Офіційний німецький футбол; безкоштовний застосунок не означає безкоштовність усіх матчів."
    },
    {
        "id": "fibayt",
        "name": "FIBA · офіційні трансляції",
        "category": "basketball",
        "cost": "free_limited",
        "url": "https://www.youtube.com/FIBA/streams",
        "note": "Окремі офіційні відкриті ефіри; YouTube iframe, а не прямий HLS."
    }
];
    var TABS=[{id:'live',name:'Наживо'},{id:'football',name:'Футбол'},{id:'other',name:'Інший спорт'},
        {id:'channels',name:'Канали'},{id:'sources',name:'Джерела'},{id:'settings',name:'Налаштування'}];
    var fallback={schema:1,updated_at:'',fixtures:[],livetv:[],services:SERVICES,channels:[],health:{}};
    var memory=null,cacheTime=0,requesting=false;
    function notify(s){try{Lampa.Noty.show('Y7 Спорт: '+s);}catch(e){}}
    function safeUrl(s){
        s=String(s||'').trim();
        if(!/^https:\/\//i.test(s)||s.length>3000)return '';
        try{var x=new URL(s);if(x.username||x.password)return '';if(!/^[a-z0-9.-]+$/i.test(x.hostname))return '';return s;}catch(e){return '';}
    }
    // LiveTV has an official Ukrainian locale at /ua/ (verified via its language menu).
    // Normalize on TV as well as in the feed, including cached 1.1.x links.
    function livetvUa(url){
        url=safeUrl(url);
        if(!url)return '';
        return url.replace(/^https:\/\/(?:www\.)?livetv\.sx(?:\/(?:ua|enx))?(?=\/|\?|#|$)/i,'https://livetv.sx/ua');
    }
    function isUaClub(s){return /шахт|shakhtar|shahtar|динамо ки[їе]в|dynamo kyiv|dynamo kiev|полісся|polissya|дніпро|dnipro|кривбас|kryvbas|карпати|karpaty/i.test(String(s||''));}
    function isEuroEvent(e){
        var info=String((e&&e.competition)||'')+' '+String((e&&e.title)||'');
        if(e&&e.sport&&e.sport!=='football')return false;
        if(/\b(?:AFC|CAF|CONCACAF|FIBA)\b|basketball|volleyball/i.test(info))return false;
        return /ліга чемпіонів|liga ch[ae]mp|champions league|лига чемпионов|ліга європи|europa league|лига европы|конференц|conference league/i.test(info);
    }
    function sortedEvents(data,filter){
        var a=(data&&data.livetv||[]).filter(function(e){return !filter||filter(e);});
        return a.sort(function(a,b){
            var aa=isUaClub(a.title)?0:isEuroEvent(a)?1:2;
            var bb=isUaClub(b.title)?0:isEuroEvent(b)?1:2;
            return aa-bb;
        });
    }
    function mediaUrl(url){return safeUrl(url)&&/\.(?:m3u8|mp4|mpd)(?:\?|$)/i.test(url);}
    function freshChannel(p){
        var checked=Date.parse(p&&p.checked_at),age=Date.now()-checked;
        return !!(p&&p.authorized===true&&p.verified===true&&p.health&&p.health.segment_checked===true&&isFinite(age)&&age>=-120000&&age<=1800000&&mediaUrl(p.url)&&!(new URL(p.url)).search);
    }
    function approvedEmbed(url){
        if(!safeUrl(url))return false;
        var p=new URL(url);
        if(p.hostname==='gw-suspilne-sport.cosmonova-broadcast.tv')return p.pathname==='/player'&&!p.search;
        return /^(?:www\.)?livetv\.sx$|^livetv(?:911|906|907)\.me$|^livetv-ru17\.me$/.test(p.hostname)&&(/\/(?:export|embed)\//i.test(p.pathname)||p.pathname==='/webplayer2.php');
    }
    function isPlayer(p){return !!(p&&safeUrl(p.url)&&((p.kind==='embed'&&approvedEmbed(p.url))||(p.kind==='direct'&&freshChannel(p))));}
    function eventId(url){var m=String(url||'').match(/\/eventinfo\/(\d+)/i);return m?m[1]:'';}
    function getStored(){try{return Lampa.Storage.get(STORE,null);}catch(e){return null;}}
    function saveStored(obj){try{Lampa.Storage.set(STORE,obj);}catch(e){}}
    function loadFeed(done,force){
        if(!memory){
            var stored=getStored();
            if(stored&&stored.schema===1)memory=stored;
        }
        if(requesting){done(memory||fallback,false,'Оновлення вже виконується');return;}
        if(!force&&memory&&Date.now()-cacheTime<3*60*1000){done(memory,true,'');return;}
        requesting=true;
        var completed=false,x=new XMLHttpRequest();
        function finish(ok,result,error){
            if(completed)return;completed=true;requesting=false;
            if(ok&&result&&result.schema===1){memory=result;cacheTime=Date.now();saveStored(result);}
            done(memory||fallback,ok,error||'');
        }
        try{
            x.open('GET',FEED+'?t='+Math.floor(Date.now()/120000),true);
            x.timeout=11500;
            x.onreadystatechange=function(){
                if(x.readyState!==4)return;
                if(x.status===200){
                    try{var json=JSON.parse(x.responseText);
                        if(!Array.isArray(json.fixtures)||!Array.isArray(json.livetv)||!Array.isArray(json.channels))throw Error('schema');
                        finish(true,json,'');
                    }catch(e){finish(false,null,'Пошкоджений JSON');}
                }else finish(false,null,'HTTP '+x.status);
            };
            x.onerror=function(){finish(false,null,'Проблема мережі');};
            x.ontimeout=function(){finish(false,null,'Тайм-аут');};
            x.send();
        }catch(e){finish(false,null,'Завантаження недоступне');}
    }
    function kyivDate(d){
        try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\//g,'-');}
        catch(e){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
    }
    function kyivTime(s){
        var d=new Date(s);if(isNaN(d.getTime()))return 'Час уточнюється';
        try{return new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);}
        catch(e){return d.toLocaleString();}
    }
    function statusText(m){return m.stale?'КЕШ · ПЕРЕВІРИТИ':m.status==='live'?'● LIVE':m.status==='finished'?'ЗАВЕРШЕНО':m.status==='postponed'?'ПЕРЕНЕСЕНО':m.status==='cancelled'?'СКАСОВАНО':m.status==='unknown'?'СТАТУС УТОЧНЮЄТЬСЯ':'АНОНС';}
    function ageLabel(feed){
        if(!feed.updated_at)return 'Розклад очікує першого завантаження';
        var age=Date.now()-Date.parse(feed.updated_at);
        if(isNaN(age))return 'Час оновлення невідомий';
        var mins=Math.max(0,Math.round(age/60000));
        return mins>60?'Дані застарілі · '+Math.floor(mins/60)+' год тому':'Оновлено '+mins+' хв тому';
    }
    function style(){
        if(document.getElementById('y7-sport-style-118'))return;
        var css='.y7s-root{height:100%;width:100%;background:#0e1722;color:#fff;overflow:hidden}'+
        '.y7s-content{padding:2em 2.7em 6em;max-width:1450px;margin:auto}'+
        '.y7s-hero{border:1px solid #366253;border-radius:1em;background:linear-gradient(100deg,#175138,#19273e);padding:1.5em;margin-bottom:1.2em}'+
        '.y7s-titlebar{font-size:2.1em;font-weight:800}.y7s-sub{font-size:.85em;color:#b9cad5;line-height:1.5}'+
        '.y7s-section{font-size:1.3em;font-weight:760;margin:1.25em 0 .65em}'+
        '.y7s-chip{display:inline-block;background:#1b2b40;color:#b6e9d1;border:1px solid #345d55;border-radius:.55em;padding:.55em .82em;margin:0 .5em .5em 0;font-weight:700}'+
        '.y7s-chip.y7s-active{background:#20754c;color:#fff}.y7s-row{display:flex;justify-content:space-between;gap:1.2em;padding:.85em 1.1em;border:1px solid #33485a;border-radius:.65em;background:#172738;margin:0 0 .55em;cursor:pointer}'+
        '.y7s-row:hover,.y7s-row.focus,.y7s-chip.focus,.y7s-chip:hover{border-color:#8cf6b7;box-shadow:0 0 0 .13em #2caa72;background:#254a4b}'+
        '.y7s-name{font-size:1.12em;font-weight:740}.y7s-value{color:#9ef5bd;font-weight:800;white-space:nowrap;align-self:center;font-size:.86em}'+
        '.y7s-msg{background:#233345;border-radius:.75em;padding:1.1em;margin:.5em 0 1em}'+
        '.y7s-qr{position:fixed;z-index:100005;inset:0;background:rgba(0,0,0,.92);display:flex;justify-content:center;align-items:center}'+
        '.y7s-card{background:#fff;color:#123;padding:1.7em;text-align:center;border-radius:1em;max-width:90vw}'+
        '.y7s-play-root{height:100%;width:100%;background:#060c15;color:#fff;display:flex;flex-direction:column}'+
        '.y7s-play-bar{display:flex;align-items:center;justify-content:space-between;gap:1em;padding:.65em 1em;background:#16293b}'+
        '.y7s-play-frame{position:relative;flex:1;min-height:55vh;background:#000}'+
        '.y7s-play-frame iframe{display:block;width:100%;height:100%;border:0;background:#000}'+
        '.y7s-play-tip{padding:.55em 1em;background:#16293b;color:#b9cad5;font-size:.8em}'+
        '.y7s-action{display:inline-block;border:1px solid #3d6875;padding:.55em 1em;margin:.1em .3em;border-radius:.5em;background:#27404d;cursor:pointer}'+
        '.y7s-action.focus,.y7s-action:hover{background:#268459;border-color:#a7ffbf}'+
        '.y7s-tabs-root{display:flex;flex-direction:column;width:100%;height:100%;background:#0b1824;color:#fff}'+
        '.y7s-tabs-h{flex:0 0 auto;background:#1c3041;border-bottom:2px solid #3a5c62;padding:.5em .8em;display:flex;flex-wrap:wrap;align-items:center;gap:.4em}'+
        '.y7s-browser-tab{cursor:pointer;display:inline-block;border-radius:.6em .6em 0 0;background:#263b4d;padding:.55em .75em;border:1px solid #537183;max-width:12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
        '.y7s-browser-tab.active,.y7s-browser-tab.focus,.y7s-browser-tab:hover{background:#21845f;border-color:#adf6ce}'+
        '.y7s-tabs-actions{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:.4em;background:#122b35;padding:.4em .8em}'+
        '.y7s-tabs-action{cursor:pointer;border:1px solid #5a8a82;border-radius:.5em;padding:.55em .75em;background:#294958}'+
        '.y7s-tabs-action.focus,.y7s-tabs-action:hover{background:#21845f;border-color:#adf6ce}'+
        '.y7s-tabs-view{position:relative;flex:1;min-height:40vh;background:#05090f}'+
        '.y7s-tabs-view iframe{display:block;position:absolute;inset:0;width:100%;height:100%;border:0;background:#05090f}'+
        '.y7s-tabs-cover{flex:0 0 auto;background:#2b423d;border-top:1px solid #709b8e;padding:.45em .8em;font-size:.85em}';
        var n=document.createElement('style');n.id='y7-sport-style-118';n.textContent=css;
        (document.head||document.documentElement).appendChild(n);
    }
    function qr(url,title,returnCtrl){
        url=livetvUa(url);
        url=safeUrl(url);if(!url)return notify('некоректне посилання');
        try{
            var overlay=$('<div class="y7s-qr"></div>'),card=$('<div class="y7s-card"></div>');
            card.append($('<div style="font-size:1.35em;font-weight:750"></div>').text(title||'Скануй телефоном'));
            var holder=$('<div style="height:224px;width:224px;margin:1em auto"></div>');
            card.append(holder);
            card.append($('<div class="y7s-sub"></div>').css('color','#345').text('Скануй QR, щоб відкрити трансляцію або сторінку на телефоні. Назад / OK — закрити.'));
            overlay.append(card);$('body').append(overlay);
            try{if(window.Y7QRCode)new window.Y7QRCode(holder[0],{text:url,width:220,height:220,correctLevel:window.Y7QRCode.CorrectLevel.M});
            else holder.text(url);}catch(e){holder.text(url);}
            function close(){document.removeEventListener('keydown',key,true);overlay.remove();try{Lampa.Controller.toggle(returnCtrl||CTRL);}catch(e){}}
            function key(e){var k=e.keyCode;if(k===13||k===27||k===461||e.key==='Escape'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();close();}}
            document.addEventListener('keydown',key,true);
            overlay.on('click',function(e){e.preventDefault();close();});
        }catch(e){notify('не вдалося відкрити QR');}
    }
    // Open third-party pages ONLY in the sandboxed Y7 tab viewer.
    // Never call native external-browser calls: on webOS these create native
    // browser windows that the Lampa plugin cannot close or enumerate.
    function addSafeTab(url,title){
        url=livetvUa(url);if(!url)return notify('Некоректна URL');
        var i=-1;
        SAFE_TABS.forEach(function(t,j){if(t.url===url)i=j;});
        if(i<0){
            SAFE_TABS.push({url:url,title:String(title||'Сторінка').slice(0,65)});
            if(SAFE_TABS.length>6)SAFE_TABS.shift();
            i=SAFE_TABS.length-1;
        }
        SAFE_ACTIVE=i;
        try{Lampa.Activity.push({url:'y7://sport/safe-tabs/1.1.8',title:'Y7 Спорт · Вкладки',component:SAFE_COMPONENT,page:1});}
        catch(e){notify('Не вдалося відкрити вкладки; використовуй QR');qr(url,title);}
    }
    function openExternal(url,title){
        url=livetvUa(url);if(!url)return notify('немає коректної адреси');
        var items=[
            {title:'Вкладка Y7 у Lampa · без нових рекламних вікон',value:'tab'},
            {title:'QR для телефона · якщо сайт не дозволяє iframe',value:'qr'}
        ];
        try{Lampa.Select.show({title:title||'Відкрити',items:items,
            onSelect:function(item){
                try{Lampa.Select.close();}catch(e){}
                if(item&&item.value==='tab')addSafeTab(url,title);
                else qr(url,title);
            },onBack:function(){try{Lampa.Controller.toggle(CTRL);}catch(e){}}
        });}catch(e){addSafeTab(url,title);}
    }
    function SafeTabs(){
        var owner=sportOwner(),self=this,dead=false,current=SAFE_ACTIVE,last=null,frame=null;
        var root=$('<div class="y7s-tabs-root"></div>'),head=$('<div class="y7s-tabs-h"></div>'),actions=$('<div class="y7s-tabs-actions"></div>'),
            view=$('<div class="y7s-tabs-view"></div>'),foot=$('<div class="y7s-tabs-cover"></div>');
        function focus(b){last=b[0];}
        function control(parent,label,callback,cls){
            var b=$('<div class="selector '+(cls||'y7s-tabs-action')+'"></div>').text(label);
            b.on('hover:focus',function(){focus(b);});
            b.on('hover:enter click',function(e){try{e.preventDefault();e.stopPropagation();}catch(_){}callback();return false;});
            parent.append(b);return b;
        }
        function dropFrame(){
            if(frame){try{frame.src='about:blank';}catch(e){}try{frame.remove();}catch(e2){}frame=null;}
        }
        function load(){
            if(dead)return;
            if(current>=SAFE_TABS.length)current=Math.max(0,SAFE_TABS.length-1);
            SAFE_ACTIVE=current;
            dropFrame();head.empty();
            head.append($('<span style="font-weight:800;padding-right:.6em"></span>').text('Y7 · Вкладки'));
            SAFE_TABS.forEach(function(t,i){
                var b=control(head,(i+1)+'. '+t.title,function(){current=i;load();},'y7s-browser-tab');
                if(i===current)b.addClass('active');
            });
            if(!SAFE_TABS.length){foot.text('Немає вкладок. Натисни Назад.');return;}
            var active=SAFE_TABS[current];
            frame=document.createElement('iframe');
            // No allow-popups, allow-top-navigation, allow-modals or downloads.
            // Ad popunders and attempts to navigate the native LG browser are blocked.
            frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation');
            frame.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
            frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
            frame.setAttribute('title',active.title);
            frame.src=active.url;
            view.append(frame);
            foot.text('LIVE TV · українська мова за замовчуванням. Нові рекламні вікна заборонені; реклама всередині сторінки можлива. ✕ Закрити вкладку / Вийти у Y7.');
            try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);}catch(e){}
        }
        function exit(){sportSetWatching(owner,false);dropFrame();try{Lampa.Controller.remove(SAFE_CTRL);}catch(e){}try{Lampa.Activity.backward();}catch(e2){}}
        function closeTab(){
            if(!SAFE_TABS.length)return exit();
            SAFE_TABS.splice(current,1);
            if(!SAFE_TABS.length){dropFrame();return exit();}
            current=Math.min(current,SAFE_TABS.length-1);load();
        }
        function refresh(){load();}
        this.create=function(){
            style();
            control(actions,'↻ Оновити',refresh);
            control(actions,'🇺🇦 LiveTV UA',function(){var t=SAFE_TABS[current];if(t&&/livetv\.sx/i.test(t.url)){t.url='https://livetv.sx/ua/';t.title='LiveTV · Українська';load();}else addSafeTab('https://livetv.sx/ua/','LiveTV · Українська');});
            control(actions,'✕ Закрити вкладку',closeTab);
            control(actions,'QR',function(){var t=SAFE_TABS[current];if(t)qr(t.url,t.title,SAFE_CTRL);});
            control(actions,'⬅ Вийти у Y7',exit);
            root.append(head).append(actions).append(view).append(foot);load();
            try{this.activity.loader(false);}catch(e){}return root;
        };
        this.render=function(){return root;};
        this.start=function(){if(dead)return;sportSetWatching(owner,!!SAFE_TABS.length);if(!frame)load();
            try{Lampa.Controller.remove(SAFE_CTRL);}catch(e){}
            Lampa.Controller.add(SAFE_CTRL,{
                toggle:function(){try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);}catch(e){}},
                up:function(){try{Navigator.move('up');}catch(e){}},
                down:function(){try{Navigator.move('down');}catch(e){}},
                left:function(){try{Navigator.move('left');}catch(e){}},
                right:function(){try{Navigator.move('right');}catch(e){}},
                enter:function(){var b=root.find('.selector.focus').first();if(b.length)b.trigger('hover:enter');},
                ok:function(){var b=root.find('.selector.focus').first();if(b.length)b.trigger('hover:enter');},
                back:exit
            });
            Lampa.Controller.toggle(SAFE_CTRL);
        };
        this.back=exit;
        this.pause=function(){sportSetWatching(owner,false);dropFrame();try{Lampa.Controller.remove(SAFE_CTRL);}catch(e){}};
        this.stop=this.pause;
        this.destroy=function(){sportSetWatching(owner,false);dead=true;dropFrame();try{Lampa.Controller.remove(SAFE_CTRL);}catch(e){}root.remove();};
    }
    function options(title,items){
        items=items.filter(function(v){return safeUrl(v.url);});
        if(!items.length)return notify('Доступних посилань немає');
        try{
            Lampa.Select.show({title:title,items:items.map(function(it,i){return {title:it.label,value:String(i)};}),
                onSelect:function(selected){var item=items[parseInt(selected.value,10)];
                    try{Lampa.Select.close();}catch(e){}
                    if(item){if(item.kind==='matchplayers')livetvOptions(item.event);else if(item.play&&mediaUrl(item.url)){playStream(item.url,title);}else openExternal(item.url,item.label);}
                },onBack:function(){Lampa.Controller.toggle(CTRL);}});
        }catch(e){openExternal(items[0].url,items[0].label);}
    }
    // LiveTV's own single-event export is sandboxed: third-party popups and
    // navigation of the parent Lampa page are not granted. This cannot remove
    // in-frame video ads or make a geo-blocked/DRM stream playable.
    function showEmbedded(title,choices,start){
        choices=(choices||[]).filter(function(x){return isPlayer(x)&&x.kind==='embed';});
        if(!choices.length)return notify('Вбудований плеєр не знайдено');
        playerRequest={title:title,choices:choices,start:Math.max(0,start||0)};
        try{Lampa.Activity.push({url:'y7://sport/live/1.1.8',title:title,component:PLAYER_COMPONENT,page:1});}
        catch(e){notify('Не вдалося відкрити плеєр');}
    }
    function LivePlayer(){
        var owner=sportOwner(),ctx=playerRequest||{},list=ctx.choices||[],current=ctx.start||0,dead=false;
        var root=$('<div class="y7s-play-root"></div>'),bar=$('<div class="y7s-play-bar"></div>'),box=$('<div class="y7s-play-frame"></div>'),tip=$('<div class="y7s-play-tip"></div>');
        var iframe=null,last=null;
        function dropFrame(){if(iframe){try{iframe.src='about:blank';}catch(e){}iframe.remove();iframe=null;}}
        function reload(){
            if(dead||!list.length)return;
            if(iframe){try{iframe.src='about:blank';}catch(e){}iframe.remove();}
            iframe=document.createElement('iframe');
            iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation');
            iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
            iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
            iframe.setAttribute('allowfullscreen','');
            iframe.setAttribute('title',ctx.title||'Спортивна трансляція');
            iframe.src=list[current].url;
            box.append(iframe);
            tip.text('Вбудований плеєр '+(current+1)+'/'+list.length+' · нові вкладки заборонені. Реклама всередині чужого плеєра може залишатися. Якщо немає відео — Наступний.');
        }
        function btn(title,action){
            var b=$('<div class="y7s-action selector"></div>').text(title);
            b.on('hover:focus',function(){last=b[0];});
            b.on('hover:enter click',function(e){try{e.preventDefault();e.stopPropagation();}catch(_e){}action();});
            bar.append(b);return b;
        }
        function next(dir){if(!list.length)return;current=(current+dir+list.length)%list.length;reload();}
        function close(){sportSetWatching(owner,false);dropFrame();try{Lampa.Controller.remove(PLAYER_CTRL);}catch(e){}try{Lampa.Activity.backward();}catch(e){}}
        this.create=function(){
            style();bar.append($('<div style="font-weight:750"></div>').text(ctx.title||'Y7 Sport Live'));
            btn('↻ Оновити',reload);btn('Наступний ▶',function(){next(1);});btn('✕ Назад',close);
            root.append(bar).append(box).append(tip);reload();
            try{this.activity.loader(false);}catch(e){}
            return root;
        };
        this.render=function(){return root;};
        this.start=function(){if(dead)return;sportSetWatching(owner,!!list.length);if(!iframe)reload();
            try{Lampa.Controller.remove(PLAYER_CTRL);}catch(e){}
            Lampa.Controller.add(PLAYER_CTRL,{
                toggle:function(){try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);}catch(e){}},
                up:function(){try{Navigator.move('up');}catch(e){}},
                down:function(){try{Navigator.move('down');}catch(e){}},
                left:function(){next(-1);},right:function(){next(1);},
                enter:function(){var b=root.find('.selector.focus').first();if(b.length)b.trigger('hover:enter');},
                ok:function(){var b=root.find('.selector.focus').first();if(b.length)b.trigger('hover:enter');},
                back:close
            });
            Lampa.Controller.toggle(PLAYER_CTRL);
        };
        this.pause=function(){sportSetWatching(owner,false);dropFrame();try{Lampa.Controller.remove(PLAYER_CTRL);}catch(e){};};
        this.stop=this.pause;
        this.back=close;
        this.destroy=function(){sportSetWatching(owner,false);dead=true;try{Lampa.Controller.remove(PLAYER_CTRL);}catch(e){}if(iframe){try{iframe.src='about:blank';}catch(e){}iframe.remove();}root.remove();};
    }
    function playableChoices(event){
        var age=Date.now()-Date.parse(event&&event.checked_at);
        if(!isFinite(age)||age< -120000||age>2*3600000)return [];
        return (event&&Array.isArray(event.players)?event.players:[]).filter(isPlayer);
    }
    function livetvOptions(e){matchSources(e,memory||fallback);}
    function findEventForFixture(m,feed){
        return (feed.events||[]).filter(function(e){return sameMatch(m,e);})[0]||null;
    }
    function playStream(url,title){
        if(!mediaUrl(url))return notify('Дозволені лише прямі HLS, MP4, DASH');
        try{
            if(!Lampa.Player||!Lampa.Player.play)throw Error('player unavailable');
            var item=(memory&&memory.channels||[]).filter(function(p){return p.url===url&&freshChannel(p);})[0];
            if(!item)return notify('Потік не перевірений або перевірка застаріла. Онови список.');
            var queue=(memory.channels||[]).filter(function(p){return p.url!==url&&item.content_id&&p.content_id===item.content_id&&freshChannel(p);});
            Lampa.Player.play({title:title,url:url,launch_player:'inner',need_check_live_stream:true,error:function(work,reserve){
                var next=queue.shift();
                if(next){notify('Помилка потоку · пробую резервне джерело');reserve(next.url);}
                else notify('Відео недоступне. Онови джерела або обери офіційний плеєр.');
            }});
        }catch(e){notify('плеєр недоступний; обери інше перевірене джерело');}
    }
    function playOfficial(p){
        var age=Date.now()-Date.parse(p&&p.checked_at);
        if(!p||p.kind!=='youtube'||p.status!=='live'||!isFinite(age)||age< -120000||age>1800000||!/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(p.url))return notify('Ефір застарів. Онови джерела.');
        try{Lampa.Player.play({title:p.title,url:p.url,launch_player:'inner',need_check_live_stream:true,
            error:function(){notify('YouTube-ефір недоступний у цьому клієнті або регіоні. Обери інше джерело.');}});}
        catch(e){notify('Ця версія Lampa не відкрила YouTube-ефір.');}
    }
    function fixtureOptions(m){matchSources(m,memory||fallback);}
    function filterFixtures(f,tab){
        var now=Date.now(),today=kyivDate(new Date());
        var arr=(f.fixtures||[]).filter(function(x){
            var tm=Date.parse(x.kickoff);if(isNaN(tm)||tm<now-86400000)return false;
            if((x.status==='scheduled'||x.status==='live')&&tm<now-4*3600000)return false;
            if(tab==='today')return kyivDate(new Date(tm))===today || x.status==='live';
            if(tab==='ua')return !!x.important;
            return tm>now-2*86400000;
        });
        arr.sort(function(a,b){
            if(a.status==='live'&&b.status!=='live')return -1;
            if(b.status==='live'&&a.status!=='live')return 1;
            if(!!a.important!==!!b.important)return a.important?-1:1;
            return Date.parse(a.kickoff)-Date.parse(b.kickoff);
        });
        return arr;
    }

    var PROVIDER_NAMES={livetv:'LiveTV',daddy:'DaddyLiveHD',ppv:'PPV',tim:'TimStreams',pit:'PitSport'};
    var SPORT_NAMES={football:'Футбол',basketball:'Баскетбол',hockey:'Хокей',tennis:'Теніс',motorsport:'Автоспорт',combat:'Єдиноборства',volleyball:'Волейбол',american_football:'Американський футбол',other:'Інший спорт'};
    var bridgeRun={generation:0,xhr:null,session:'',base:'',key:'',owner:''};
    function stored(key,value){try{return Lampa.Storage.get(key,value);}catch(e){return value;}}
    function store(key,value){try{Lampa.Storage.set(key,value);}catch(e){}}
    function bridgeConfig(){return {url:stored('y7_sport_bridge_url','http://10.2.4.44:9122'),key:stored('y7_sport_bridge_key','')};}
    function bridgeBase(value){
        try{var u=new URL(String(value).trim());if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.search||u.hash)return '';return u.href.replace(/\/$/,'');}catch(e){return '';}
    }
    function bridgeError(code){return ({ENGINE_UNAVAILABLE:'AceStream Engine не запущено на сервері',NO_NATIVE_MEDIA:'Джерело не віддало пряме відео',
        SOURCE_EXPIRED:'Посилання вже неактивне',UNAUTHORIZED:'Невірний ключ доступу до сервера',PROTECTED_MEDIA:'Захищене відео не підтримується',
        PROTECTED_SOURCE:'Джерело потребує окремого доступу',SOPCAST_UNSUPPORTED:'SopCast не підтримується',BUSY:'Сервер зайнятий — повтори пізніше',
        NETWORK:'Немає зв’язку з сервером. Перевір адресу, мережу та HTTP/HTTPS',TIMEOUT:'Сервер не підготував відео вчасно'})[code]||'Відео недоступне · '+String(code||'UNKNOWN');}
    function bridgeCall(base,key,path,data,done){
        var x=new XMLHttpRequest(),finished=false;
        function end(err,obj){if(finished)return;finished=true;done(err,obj);}
        try{x.open('POST',base+path,true);x.timeout=150000;x.setRequestHeader('Content-Type','application/json');x.setRequestHeader('Authorization','Bearer '+key);
            x.onreadystatechange=function(){if(x.readyState!==4)return;try{var obj=JSON.parse(x.responseText);end(obj.ok?null:(obj.error||'NETWORK'),obj);}catch(e){end('NETWORK');}};
            x.onerror=function(){end('NETWORK');};x.ontimeout=function(){end('TIMEOUT');};x.send(JSON.stringify(data||{}));
        }catch(e){end('NETWORK');}return x;
    }
    function cancelBridge(){
        bridgeRun.generation++;
        if(bridgeRun.session)bridgeCall(bridgeRun.base,bridgeRun.key,'/api/stop',{session_id:bridgeRun.session},function(){});
        bridgeRun.session='';
        if(bridgeRun.owner)sportSetWatching(bridgeRun.owner,false);
        bridgeRun.owner='';
    }
    function selectList(title,items,onSelect,onBack){
        Lampa.Select.show({title:title,items:items,onSelect:function(item){try{Lampa.Select.close();}catch(e){}onSelect(item);},
            onBack:function(){try{Lampa.Select.close();}catch(e){}if(onBack)onBack();else Lampa.Controller.toggle(CTRL);}});
    }
    function textInput(title,value,password,done){
        if(!Lampa.Input||!Lampa.Input.edit)return notify('Онови Lampa: клавіатура недоступна');
        Lampa.Input.edit({title:title,value:value||'',password:!!password,nosave:true,nomic:true,keyboard:'lampa',free:true},function(v){done(String(v||'').trim());Lampa.Controller.toggle(CTRL);});
    }
    function bridgeReady(){var c=bridgeConfig();return !!(bridgeBase(c.url)&&c.key.length>=32);}
    function providerEnabled(id){var disabled=stored('y7_sport_disabled_sources',[]);return disabled.indexOf(id)<0;}
    function sameMatch(a,b){
        if(a.id&&a.id===b.id)return true;
        // Feed builder provides normalized identities across languages/providers.
        if(!a.home_key||!b.home_key||a.home_key!==b.home_key||a.away_key!==b.away_key)return false;
        if(a.sport&&b.sport&&a.sport!==b.sport)return false;
        var x=Date.parse(a.kickoff),y=Date.parse(b.kickoff);
        return !isFinite(x)||!isFinite(y)||Math.abs(x-y)<=10800000;
    }
    function activeEvent(e){
        if(/^(finished|cancelled|postponed|unknown)$/.test(e.status||''))return false;
        var start=Date.parse(e.kickoff),end=Date.parse(e.ends_at);
        if(isFinite(end)&&end<Date.now())return false;
        return !isFinite(start)||start>=Date.now()-5*3600000;
    }
    function sourcesFor(m,feed){
        var result=[],seen={};
        if(!activeEvent(m))return result;
        function add(e){if(!providerEnabled(e.provider)||!activeEvent(e))return;
            (e.sources||[]).forEach(function(x){var k=[x.provider,x.kind,x.id,x.event_id||''].join(':');
                if(!seen[k]&&providerEnabled(x.provider)&&x.kind!=='sopcast'){seen[k]=true;result.push(x);}});}
        add(m);
        (feed.events||[]).forEach(function(e){if(sameMatch(m,e))add(e);});
        return result;
    }
    function playBridge(title,sources){
        var c=bridgeConfig(),base=bridgeBase(c.url);
        if(!bridgeReady())return notify('Спочатку налаштуй сервер 10.2.4.44 у Y7 Спорт → Налаштування');
        cancelBridge();var generation=bridgeRun.generation,queue=sources.slice(),failures=[],owner=sportOwner();
        bridgeRun.base=base;bridgeRun.key=c.key;bridgeRun.owner=owner;sportSetWatching(owner,true);
        function cancel(){cancelBridge();Lampa.Controller.toggle(CTRL);}
        selectList('Готуємо відео · '+title,[{title:'Скасувати',value:'cancel'}],cancel,cancel);
        function fail(){
            try{Lampa.Select.close();}catch(e){}cancelBridge();
            selectList('Відео не вдалося відкрити',failures.map(function(v){return {title:v};}).concat([{title:'Вибрати інше джерело',value:'retry'}]),function(item){
                if(item.value==='retry')matchSources({title:title,sources:sources},memory||fallback);else Lampa.Controller.toggle(CTRL);
            });
        }
        function next(reserve){
            if(generation!==bridgeRun.generation)return;
            var source=queue.shift();if(!source)return fail();
            notify('Перевіряю '+(source.title||PROVIDER_NAMES[source.provider]||'джерело'));
            bridgeRun.xhr=bridgeCall(base,c.key,'/api/resolve',{source:source},function(err,answer){
                if(generation!==bridgeRun.generation){if(answer&&answer.session_id)bridgeCall(base,c.key,'/api/stop',{session_id:answer.session_id},function(){});return;}
                if(!err&&(!answer||answer.transport_checked!==true||!/^\/media\/[A-Za-z0-9_-]{32}\/index\.m3u8$/.test(answer.path)))err='NO_NATIVE_MEDIA';
                if(err){if(answer&&answer.session_id)bridgeCall(base,c.key,'/api/stop',{session_id:answer.session_id},function(){});failures.push((PROVIDER_NAMES[source.provider]||source.kind)+': '+bridgeError(err));return next(reserve);}
                bridgeRun.session=answer.session_id;
                try{Lampa.Select.close();}catch(e){}
                try{
                    if(reserve)return reserve(base+answer.path);
                    Lampa.Player.play({title:title,url:base+answer.path,launch_player:'inner',need_check_live_stream:true,
                        error:function(work,retry){
                            if(generation!==bridgeRun.generation)return;
                            if(bridgeRun.session)bridgeCall(base,c.key,'/api/stop',{session_id:bridgeRun.session},function(){});
                            bridgeRun.session='';failures.push((source.title||'Джерело')+': помилка плеєра');next(retry);
                        }});
                }catch(e){failures.push('Плеєр Lampa недоступний');fail();}
            });
        }
        next();
    }
    function matchSources(m,feed){
        var sources=sourcesFor(m,feed),title=m.title||(m.home+' — '+m.away);
        if(!sources.length)return notify(activeEvent(m)?'Відеоджерел для цього матчу ще немає. Спробуй оновити ближче до початку.':'Матч завершився або статус застарів');
        var groups={};sources.forEach(function(s){var k=s.kind==='acestream'?'acestream':s.provider;(groups[k]||(groups[k]=[])).push(s);});
        // Round-robin providers, so automatic fallback does not try forty
        // channels from one broken provider before another available source.
        var automatic=[],i=0,keys=Object.keys(groups),priority=['pit','acestream','livetv','tim','ppv','daddy'];
        keys.sort(function(a,b){return priority.indexOf(a)-priority.indexOf(b);});
        while(automatic.length<8){var added=false;keys.forEach(function(k){if(groups[k][i]&&automatic.length<8){automatic.push(groups[k][i]);added=true;}});if(!added)break;i++;}
        var items=[{title:'▶ Автоматично підібрати джерело',value:'auto',subtitle:bridgeReady()?'Відкрити у плеєрі Lampa':'Потрібне налаштування сервера'}];
        keys.forEach(function(k){items.push({title:(k==='acestream'?'AceStream · P2P':PROVIDER_NAMES[k]||k)+' · '+groups[k].length,value:k,subtitle:'Доступність відео перевіряється при відкритті'});});
        selectList(title,items,function(item){
            if(item.value==='auto')return playBridge(title,automatic);
            var list=groups[item.value]||[];
            selectList(title+' · '+item.title,list.map(function(s,j){return {title:s.title||(item.title+' '+(j+1)),value:String(j),subtitle:s.kind==='acestream'?'Через AceStream Engine на сервері':'Пряме відео через сервер'};}),function(v){playBridge(title,[list[Number(v.value)]]);},function(){matchSources(m,feed);});
        });
    }
    function displayEvents(feed,mode,filter,query){
        var grouped=[],raw=(feed.events||[]).filter(function(e){return providerEnabled(e.provider)&&activeEvent(e);});
        raw.sort(function(a,b){return Date.parse(a.kickoff||0)-Date.parse(b.kickoff||0);});
        raw.forEach(function(e){var found=grouped.filter(function(g){return sameMatch(g,e);})[0];
            if(!found){var copy={};Object.keys(e).forEach(function(k){copy[k]=e[k];});grouped.push(copy);}
            else{if(e.status==='live')found.status='live';if(!found.kickoff&&e.kickoff)found.kickoff=e.kickoff;if(!found.competition&&e.competition)found.competition=e.competition;}});
        return grouped.filter(function(e){
            if(mode==='live'&&e.status!=='live')return false;
            if(mode==='football'&&e.sport!=='football')return false;
            if(mode==='other'&&(e.sport==='football'||(filter!=='all'&&e.sport!==filter)))return false;
            if(mode==='football'&&filter==='europe'&&!isEuroEvent(e))return false;
            if(mode==='football'&&filter==='ua'&&!isUaClub(e.title))return false;
            if(!sourcesFor(e,feed).length)return false;
            return !query||(e.title+' '+e.competition).toLowerCase().indexOf(query.toLowerCase())>=0;
        }).sort(function(a,b){
            function rank(e){return (e.status==='live'?0:10)+(e.sport==='football'?0:4)+(isUaClub(e.title)?0:isEuroEvent(e)?1:2);}
            return rank(a)-rank(b)||(Date.parse(a.kickoff)||0)-(Date.parse(b.kickoff)||0);
        });
    }
    function Sport(){
        var self=this,root=$('<div class="y7s-root"></div>'),scroll=new Lampa.Scroll({mask:false,over:true,nopadding:true}),body=$('<div class="y7s-content"></div>');
        var feed=memory||fallback,tab='live',filter='all',query='',last=null,dead=false,timer=0,error='';
        function section(s){body.append($('<div class="y7s-section"></div>').text(s));}
        function focus(){if(dead)return;try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last&&root[0].contains(last)?last:root.find('.selector')[0],root);}catch(e){}}
        function bind(r,action){r.on('hover:focus',function(){last=r[0];try{scroll.update(r,true);}catch(e){}});
            r.on('hover:enter click',function(e){try{e.preventDefault();e.stopPropagation();}catch(_e){}if(action)action();return false;});return r;}
        function row(title,sub,badge,action){var r=$('<div class="y7s-row selector"></div>'),left=$('<div></div>');
            left.append($('<div class="y7s-name"></div>').text(title)).append($('<div class="y7s-sub"></div>').text(sub||''));
            r.append(left).append($('<div class="y7s-value"></div>').text(badge||''));body.append(bind(r,action));return r;}
        function chip(title,active,action){var r=$('<div class="y7s-chip selector"></div>').text(title);if(active)r.addClass('y7s-active');body.append(bind(r,action));}
        function rebuild(){last=null;build();focus();}
        function load(force){loadFeed(function(data,ok,err){if(dead)return;feed=data;error=ok?'':err;build();focus();},force);}
        function eventRow(e){var count=sourcesFor(e,feed).length;row((isUaClub(e.title)?'🇺🇦 ':'')+e.title,
            (e.competition||SPORT_NAMES[e.sport]||'Спорт')+(e.kickoff?' · '+kyivTime(e.kickoff):'')+' · '+count+' джерел',
            e.status==='live'?'● LIVE':'НЕЗАБАРОМ',function(){matchSources(e,feed);});}
        function build(){
            if(dead)return;body.empty();var hero=$('<div class="y7s-hero"></div>');
            hero.append('<div class="y7s-titlebar">⚽ Y7 Спорт</div>').append($('<div class="y7s-sub"></div>').text('Трансляції у плеєрі Lampa · '+ageLabel(feed)+(error?' · '+error:'')));body.append(hero);
            TABS.forEach(function(t){chip(t.name,tab===t.id,function(){tab=t.id;filter='all';query='';rebuild();});});
            body.append('<div></div>');
            chip('↻ Оновити',false,function(){load(true);});
            if(/^(live|football|other|channels)$/.test(tab)){
                chip(query?'Пошук: '+query:'⌕ Пошук',!!query,function(){textInput('Знайти команду або подію',query,false,function(v){query=v;rebuild();});});
                if(query)chip('Скинути пошук',false,function(){query='';rebuild();});
            }
            if(tab==='live'||tab==='football'||tab==='other'){
                if(tab==='football')[['all','Увесь футбол'],['europe','Єврокубки'],['ua','Україна']].forEach(function(x){chip(x[1],filter===x[0],function(){filter=x[0];rebuild();});});
                if(tab==='other')[['all','Усі види']].concat(Object.keys(SPORT_NAMES).filter(function(k){return k!=='football';}).map(function(k){return [k,SPORT_NAMES[k]];})).forEach(function(x){chip(x[1],filter===x[0],function(){filter=x[0];rebuild();});});
                section(tab==='live'?'Зараз у прямому ефірі':tab==='football'?'Футбольні трансляції':'Спортивні трансляції');
                var list=displayEvents(feed,tab,filter,query);list.forEach(eventRow);
                if(!list.length)row('Наразі відповідних трансляцій немає','Онови список або зміни фільтр. Джерела часто з’являються перед початком ефіру.','');
                if(tab==='football')row('Розклад єврокубків','Матчі без відеоджерел показуються окремо','РОЗКЛАД',function(){
                    var fixtures=filterFixtures(feed,filter==='ua'?'ua':'europe').filter(function(m){return m.status!=='finished';}).slice(0,100);
                    selectList('Найближчі єврокубки',fixtures.map(function(m,i){return {title:m.home+' — '+m.away,value:String(i),subtitle:kyivTime(m.kickoff)+' · '+sourcesFor(m,feed).length+' відеоджерел'};}),function(item){fixtureOptions(fixtures[Number(item.value)]);});
                });
            }else if(tab==='channels'){
                section('Прямі канали');var streams=(feed.channels||[]).filter(freshChannel);
                streams.forEach(function(p){row(p.title,p.provider||'Перевірений потік','▶',function(){playStream(p.url,p.title);});});
                (feed.official_live||[]).filter(function(p){return Date.now()-Date.parse(p.checked_at)<=1800000&&p.status==='live';}).forEach(function(p){row(p.title,p.provider,'YOUTUBE',function(){playOfficial(p);});});
                section('Канали агрегаторів');var channels=(feed.aggregator_channels||[]).filter(function(e){return providerEnabled(e.provider)&&(!query||e.title.toLowerCase().indexOf(query.toLowerCase())>=0);});
                channels.forEach(function(e){row(e.title,PROVIDER_NAMES[e.provider]||e.provider,'ДЖЕРЕЛА',function(){matchSources(e,feed);});});
                if(!streams.length&&!channels.length)row('Каналів поки немає','Онови список','');
                (feed.official_embeds||[]).forEach(function(p){if(isPlayer(p))row(p.name,'Офіційний вебплеєр · не прямий потік','IFRAME',function(){showEmbedded(p.name,[p],0);});});
            }else if(tab==='sources'){
                section('Джерела трансляцій');
                (feed.providers||Object.keys(PROVIDER_NAMES).map(function(id){return {id:id,name:PROVIDER_NAMES[id]};})).forEach(function(p){
                    var enabled=providerEnabled(p.id),state=p.status==='error'?'Тимчасова помилка':p.status==='empty'?'Поки порожньо':(p.events||'')+' подій';
                    row(p.name,state+' · натисни, щоб '+(enabled?'вимкнути':'увімкнути'),enabled?'УВІМК.':'ВИМК.',function(){var d=stored('y7_sport_disabled_sources',[]).filter(function(id){return id!==p.id;});if(enabled)d.push(p.id);store('y7_sport_disabled_sources',d);rebuild();});
                });
                section('Офіційні спортивні сервіси');
                (feed.services||SERVICES).forEach(function(p){row(p.name,p.note,p.cost==='paid'?'ПЕРЕДПЛАТА':'БЕЗКОШТ./ЧАСТК.',function(){qr(p.url,p.name);});});
            }else if(tab==='settings'){
                var config=bridgeConfig();section('Сервер відтворення');
                row('Адреса сервера',config.url,'ЗМІНИТИ',function(){textInput('Адреса Y7 Sport Bridge',config.url,false,function(v){var base=bridgeBase(v);if(base){cancelBridge();store('y7_sport_bridge_url',base);rebuild();}else notify('Вкажи HTTP/HTTPS адресу без ключів у посиланні');});});
                row('Ключ доступу',config.key?'Збережений лише в цій Lampa':'Скопіюй із приватного bridge-config.json на сервері',config.key?'ЗАДАНО':'ДОДАТИ',function(){textInput('Приватний ключ Sport Bridge','',true,function(v){if(v.length>=32){cancelBridge();store('y7_sport_bridge_key',v);rebuild();}else if(v)notify('Ключ має містити щонайменше 32 символи');});});
                row('Перевірити сервер та AceStream','Потрібен встановлений компонент на 10.2.4.44','ПЕРЕВІРИТИ',function(){if(!bridgeReady())return notify('Спочатку введи адресу та ключ');bridgeCall(bridgeBase(config.url),config.key,'/api/check',{},function(err,obj){notify(err?bridgeError(err):'Сервер працює · AceStream '+(obj.engine&&obj.engine.available?'працює':'не запущено'));});});
                row('Відкрити власний AceStream ID','Встав 40 символів ID або acestream://ID','P2P',function(){textInput('AceStream ID','',false,function(v){v=v.replace(/^acestream:\/\//i,'');if(/^[a-fA-F0-9]{40}$/.test(v))playBridge('AceStream',[{kind:'acestream',provider:'manual',id:v,title:'Власний AceStream'}]);else notify('Невірний AceStream ID');});});
                row('Видалити збережений ключ','Від’єднати цей клієнт від Sport Bridge','ВИДАЛИТИ',function(){cancelBridge();store('y7_sport_bridge_key','');rebuild();});
                section('Y7 Спорт '+VERSION);
                body.append($('<div class="y7s-msg"></div>').text('Сервер перевіряє плейлист і відеосегмент перед запуском. HTML-сторінки та реклама сайтів не відкриваються замість відео. Наявність джерела не гарантує ефір. AceStream потребує engine на сервері; SopCast не підтримується.'));
            }
        }
        this.create=function(){style();build();scroll.append(body);root.append(scroll.render());try{this.activity.loader(false);}catch(e){}load(false);timer=setInterval(function(){if(!dead)load(false);},180000);return root;};
        this.render=function(){return root;};
        function off(){try{Lampa.Controller.remove(CTRL);}catch(e){}}
        function back(){cancelBridge();off();Lampa.Activity.backward();}
        this.start=function(){off();Lampa.Controller.add(CTRL,{toggle:focus,up:function(){Navigator.move('up');},down:function(){Navigator.move('down');},left:function(){Navigator.move('left');},right:function(){Navigator.move('right');},
            enter:function(){root.find('.selector.focus').first().trigger('hover:enter');},ok:function(){root.find('.selector.focus').first().trigger('hover:enter');},back:back});Lampa.Controller.toggle(CTRL);};
        this.back=back;this.pause=off;this.stop=off;
        this.destroy=function(){dead=true;if(timer)clearInterval(timer);cancelBridge();off();try{scroll.destroy();}catch(e){}root.remove();};
    }
    function openSport(){
        try{Lampa.Activity.push({url:'y7://sport/1.1.8',title:'Y7 Спорт',component:COMPONENT,page:1});}
        catch(e){notify('не вдалося відкрити модуль');}
    }
    function boot(){
        if(!window.Lampa||!Lampa.Component||!Lampa.Activity||!Lampa.Scroll||!window.jQuery){setTimeout(boot,450);return;}
        try{Lampa.Component.add(PLAYER_COMPONENT,LivePlayer);Lampa.Component.add(SAFE_COMPONENT,SafeTabs);Lampa.Component.add(COMPONENT,Sport);}catch(e){notify('помилка реєстрації');return;}
        try{
            if(Lampa.Menu&&Lampa.Menu.addButton&&!document.querySelector('.y7-sport-menu')){
                var m=Lampa.Menu.addButton(ICON,'Y7 Спорт',openSport),q=m&&m.jquery?m:$(m||[]);
                if(q&&q.length)q.addClass('y7-sport-menu');
            }
        }catch(e){}
        try{
            if(Lampa.Head&&Lampa.Head.addIcon&&!document.querySelector('.y7-sport-head')){
                var h=Lampa.Head.addIcon(ICON,openSport),q2=h&&h.jquery?h:$(h||[]);
                if(q2&&q2.length)q2.addClass('y7-sport-head').attr('title','Y7 Спорт');
            }
        }catch(e){}
        try{if(Lampa.Player&&Lampa.Player.listener)Lampa.Player.listener.follow('close',cancelBridge);}catch(e){}
        window.Y7Sport={version:VERSION,open:openSport,refresh:function(){cacheTime=0;},feedUrl:FEED,isWatching:sportIsWatching};
    }
    boot();
})();
