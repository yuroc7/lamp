/*
 * Y7 SPORT / Football First 1.1.7
 * Separate Lampa / LG webOS extension: no changes to 1.js, Lampac or Y7 Gateway.
 * Uses static, automatically refreshed public match metadata from GitHub Pages.
 * LiveTV: embedded single-event player where provided, plus explicitly public video tags.
 * Authorized public direct HLS/MP4/DASH streams may be supplied in sport_channels.json.
 */
(function(){
    'use strict';
    var VERSION='1.1.7',KEY='__Y7_SPORT_FOOTBALL_117__';
    if(window[KEY])return;
    window[KEY]=true;
    var COMPONENT='y7_sport_117',CTRL='y7_sport_117_ctrl';
    var PLAYER_COMPONENT='y7_sport_live_player_117',PLAYER_CTRL='y7_sport_live_player_ctrl_117';
    var SAFE_COMPONENT='y7_sport_safe_tabs_117',SAFE_CTRL='y7_sport_safe_tabs_ctrl_117';
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
    var STORE='y7_sport_feed_117';
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
    var TABS=[
        {id:'livetv',name:'LiveTV'},
        {id:'free',name:'Безкоштовно'},
        {id:'streams',name:'Мої канали'},
        {id:'today',name:'Сьогодні'},
        {id:'europe',name:'Єврокубки'},
        {id:'ua',name:'Українські'},
        {id:'all',name:'Усі сервіси'}
    ];
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
        if(document.getElementById('y7-sport-style-114'))return;
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
        var n=document.createElement('style');n.id='y7-sport-style-114';n.textContent=css;
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
        try{Lampa.Activity.push({url:'y7://sport/safe-tabs/1.1.7',title:'Y7 Спорт · Вкладки',component:SAFE_COMPONENT,page:1});}
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
        try{Lampa.Activity.push({url:'y7://sport/live/1.1.7',title:title,component:PLAYER_COMPONENT,page:1});}
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
    function livetvOptions(event){
        var title=event.title||'LiveTV · футбол';
        var available=playableChoices(event);
        var choices=[];
        available.forEach(function(p,i){
            var name=p.kind==='direct'?'▶ Відеопотік '+(i+1):'▶ LiveTV iframe '+(i+1)+' · '+(p.title||'плеєр');
            choices.push({label:name,kind:p.kind,url:p.url,play:p.kind==='direct'});
        });
        choices.push({label:'🇺🇦 LiveTV · українська сторінка у вкладці Y7',kind:'safe',url:livetvUa(event.url)});
        choices.push({label:'LiveTV UA · QR для телефона',kind:'qr',url:livetvUa(event.url)});
        if(!available.length)notify('Окремих плеєрів для цього матчу ще немає. Онови джерела ближче до ефіру.');
        try{
            Lampa.Select.show({title:title,
                items:choices.map(function(c,i){return {title:c.label,value:String(i)};}),
                onSelect:function(choice){
                    var c=choices[parseInt(choice.value,10)];
                    try{Lampa.Select.close();}catch(e){}
                    if(!c)return;
                    if(c.kind==='direct')return playStream(c.url,title);
                    if(c.kind==='embed')return showEmbedded(title,available.filter(function(p){return p.kind==='embed';}),available.filter(function(p){return p.kind==='embed';}).findIndex(function(p){return p.url===c.url;}));
                    if(c.kind==='qr')return qr(c.url,'LiveTV · сторінка матчу (телефон)');
                    if(c.kind==='safe')return addSafeTab(c.url,title);
                    return openExternal(c.url,'LiveTV · зовнішній сайт із рекламою');
                },onBack:function(){Lampa.Controller.toggle(CTRL);}
            });
        }catch(e){notify('Не вдалося відкрити список джерел');}
    }
    function findEventForFixture(m,feed){
        var id=eventId(m.livetv_url);
        if(!id)return null;
        var found=(feed.livetv||[]).filter(function(e){return e.id===id;});
        return found.length?found[0]:null;
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
    function fixtureOptions(m){
        var title=(m.home||'')+' — '+(m.away||'');
        var items=[];
        if(m.broadcast&&safeUrl(m.broadcast.url))items.push({label:(m.broadcast.name||'Офіційний мовник')+' · '+(m.broadcast.cost==='paid'?'передплата':'за умовами сервісу'),url:m.broadcast.url});
        var found=findEventForFixture(m,memory||fallback);
        if(found&&playableChoices(found).length)items.unshift({label:'▶ LiveTV · '+playableChoices(found).length+' можливих плеєрів',kind:'matchplayers',event:found,url:found.url});
        if(safeUrl(m.livetv_url))items.push({label:'LiveTV · українська сторінка у вкладці Y7',url:livetvUa(m.livetv_url)});
        items.push({label:'UEFA.tv · огляди, архів, окремі безкоштовні матчі',url:'https://www.uefa.tv/'});
        options(title,items);
    }
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
    function Sport(){
        var self=this,root=$('<div class="y7s-root"></div>'),scroll=new Lampa.Scroll({mask:false,over:true,nopadding:true}),body=$('<div class="y7s-content"></div>');
        var feed=memory||fallback,tab='livetv',last=null,dead=false,timer=0,error='';
        function section(s){body.append($('<div class="y7s-section"></div>').text(s));}
        function row(title,sub,badge,action){
            var r=$('<div class="y7s-row selector"></div>'),left=$('<div></div>');
            left.append($('<div class="y7s-name"></div>').text(title));
            left.append($('<div class="y7s-sub"></div>').text(sub||''));
            r.append(left).append($('<div class="y7s-value"></div>').text(badge||''));
            r.on('hover:focus',function(){last=r[0];try{scroll.update(r,true);}catch(e){try{scroll.immediate(r,true);}catch(_e){}}});
            r.on('hover:enter click',function(e){try{e&&e.preventDefault();e&&e.stopPropagation();}catch(_e){}if(action)action();return false;});
            body.append(r);return r;
        }
        function changeTab(next){tab=next;last=null;build();setTimeout(function(){if(dead)return;try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(root.find('.selector')[0],root);}catch(e){}},40);}
        function button(t){
            var r=$('<div class="y7s-chip selector"></div>').text(t.name);
            if(t.id===tab)r.addClass('y7s-active');
            r.on('hover:focus',function(){last=r[0];});
            r.on('hover:enter click',function(e){try{e.preventDefault();e.stopPropagation();}catch(_e){}changeTab(t.id);});
            body.append(r);
        }
        function load(force){
            loadFeed(function(data,ok,err){if(dead)return;feed=data;error=ok?'':err;build();},force);
        }
        function build(){
            if(dead)return;
            body.empty();
            var hero=$('<div class="y7s-hero"></div>');
            hero.append('<div class="y7s-titlebar">⚽ Y7 Спорт · Футбол</div>');
            hero.append($('<div class="y7s-sub"></div>').text('Ліга чемпіонів · Ліга Європи · Ліга конференцій · LiveTV Україна · безкоштовний спорт'));
            hero.append($('<div class="y7s-sub"></div>').text(ageLabel(feed)+(error?' · '+error:'')));
            body.append(hero);
            TABS.forEach(button);
            row('↻ Оновити відеоджерела та матчі','Завантажити новий список з Y7 Sport (автооновлення кожні 20 хв).','ОНОВИТИ',function(){cacheTime=0;load(true);});
            var calendar=feed.health;
            if(calendar&&(tab==='today'||tab==='europe'||tab==='ua'))row('Стан календаря',String(calendar.fixtures_ok||0)+' / '+String(calendar.fixtures_total||3)+' турніри · '+(calendar.fixtures_fallback?'є резервні дані · перевір час оновлення':'UEFA / резервні джерела'),'РОЗКЛАД');
            var probes=feed.health&&feed.health.livetv_player_probes;
            if(probes&&tab==='livetv')row('Стан перевірки плеєрів','Завантажено сторінок: '+(probes.fetched||0)+'/'+(probes.attempted||0)+' · помилки: '+(probes.errors||0)+' · iframe DOM: '+(probes.with_embeds||0)+' · шаблони: '+(probes.with_raw_webplayer_markup||0),'СТАТУС',function(){notify('Знайдений iframe ще не означає робочий відеопотік');});
            if(tab==='livetv'||tab==='free'){
                var live=(feed.official_live||[]).filter(function(p){var age=Date.now()-Date.parse(p.checked_at);return p.status==='live'&&isFinite(age)&&age>=-120000&&age<=1800000;});
                if(live.length)section('Офіційне відео наживо');
                live.forEach(function(p){row(p.title,p.provider+' · '+p.note,'▶ YOUTUBE LIVE',function(){playOfficial(p);});});
                (feed.official_embeds||[]).forEach(function(p){if(isPlayer(p))row(p.name,p.note,'▶ ОФІЦІЙНИЙ IFRAME',function(){showEmbedded(p.name,[p],0);});});
            }
            if(tab==='today'||tab==='europe'||tab==='ua'){
                section(tab==='today'?'Футбол сьогодні':tab==='ua'?'Матчі українських клубів':'Найближчі єврокубки');
                var matches=filterFixtures(feed,tab);
                if(!matches.length)row('Наразі матчів немає','Онови список. Якщо дані застарілі — перевір сайт мовника.','','');
                matches.forEach(function(m){
                    var ua=m.important?'🇺🇦 ':'';
                    var sub=(m.competition||'Футбол')+' · '+kyivTime(m.kickoff);
                    if(m.score)sub+=' · '+m.score;
                    sub+=' · '+(m.broadcast&&m.broadcast.cost==='paid'?'Мовник: передплата':'Мовник уточнюється');
                    row(ua+m.home+' — '+m.away,sub,statusText(m),function(){fixtureOptions(m);});
                });
                if(tab==='europe'){
                    var euro=sortedEvents(feed,isEuroEvent).slice(0,28);
                    section('LiveTV · єврокубкові сторінки (не прямі трансляції)');
                    if(!euro.length)row('Немає підтверджених єврокубкових посилань LiveTV','Розклад може тимчасово бути недоступним. Спробуй оновити.','','');
                    euro.forEach(function(e){
                        row((isUaClub(e.title)?'🇺🇦 ':'')+e.title,(e.competition||'Єврокубки')+' · час уточнюй на сторінці',
                            playableChoices(e).length?'ПЛЕЄР':'СТОРІНКА',function(){livetvOptions(e);});
                    });
                }
                section('Трансляції єврокубків');
                row('MEGOGO Футбол','Офіційні матчі ЛЧ в Україні, за передплатою.','ПЛАТНО',function(){openExternal('https://megogo.net/ua/sport','MEGOGO Футбол');});
                row('LiveTV · футбольний календар','Матчі, зовнішні сторінки з посиланнями. Не гарантія прямого відео.','СТОРІНКИ',function(){changeTab('livetv');});
            }else if(tab==='livetv'){
                section('LiveTV · можливі плеєри всередині Lampa');
                row('🇺🇦 Відкрити LiveTV українською','Офіційна українська версія. У вкладці Y7 без нових рекламних вікон.','ВІДКРИТИ',function(){addSafeTab('https://livetv.sx/ua/','LiveTV · Українська');});
                row('Про рекламу та пряме відео','Попапи й зовнішній браузер блокуються. Реклама всередині чужого iframe не контролюється. Прямих потоків може не бути.','ВАЖЛИВО',function(){notify('Прямі відео запускаємо у плеєрі Lampa лише якщо є придатна відкрита адреса.');});
                row('Як працюють плеєри','Окремий плеєр, якщо він є. Для сторінок — вкладки Y7 з кнопками Закрити та Вийти, без нових вікон LG.','ІНФО',function(){notify('Вбудований плеєр може містити власну рекламу або бути заблокований');});
                var events=sortedEvents(feed);
                if(!events.length)row('Список поки порожній','LiveTV може тимчасово блокувати автоматичне зчитування; відкрий сайт.','','');
                events.forEach(function(e){
                    var found=playableChoices(e),label=found.length?('Знайдено '+found.length+' плеєр(ів), робота не підтверджена'):(e.probe_status==='fetch_error'?'Перевірка цієї сторінки не вдалася':(!Array.isArray(e.players)?'Плеєр ще не перевірявся':'Окремого плеєра матчу не виявлено'));
                    row(e.title||'Матч',((e.competition?e.competition+' · ':'')+label),found.length?'▶ ПЛЕЄРИ':'ДЖЕРЕЛА',function(){livetvOptions(e);});
                });
            }else if(tab==='free'||tab==='all'){
                section(tab==='free'?'Безкоштовні офіційні спортивні сервіси':'Усі спортивні сервіси');
                (feed.services&&feed.services.length?feed.services:SERVICES).forEach(function(s){
                    if(tab==='free'&&s.cost==='paid')return;
                    var cost=s.cost==='free'?'БЕЗКОШТОВНО':s.cost==='paid'?'ПЕРЕДПЛАТА':'ЧАСТКОВО';
                    row(s.name,s.note||'',cost,function(){openExternal(s.url,s.name);});
                });
            }else if(tab==='streams'){
                section('Мої дозволені прямі трансляції');
                row('Що тут показується','Тільки канали, які ти додав у sport_channels.json із дозволом на відтворення.','INFO',function(){notify('Додай свої відкриті HLS/MP4/DASH посилання та запусти оновлення JSON');});
                var streams=(feed.channels||[]).filter(freshChannel);
                if(!streams.length)row('Канали не додані','Безкоштовні відкриті офіційні потоки додаватимемо сюди.','','');
                streams.forEach(function(s){
                    if(!freshChannel(s))return;
                    row(s.title,s.note||s.provider||'Прямий відеопотік','▶ PLAY',function(){playStream(s.url,s.title);});
                });
            }
            section('Доступ та якість');
            body.append($('<div class="y7s-sub"></div>').text('LiveTV відкривається українською у вкладках Y7: нові рекламні вікна не створюються, але реклама всередині чужого iframe може залишатися й деякі сайти забороняють вбудовування. Прямі відкриті HLS/MP4/DASH запускаються штатним плеєром. DRM, геообмеження й передплати не обходяться. Наявність плеєра не гарантує наявності відео.'));
        }
        this.create=function(){
            style();build();scroll.append(body);root.append(scroll.render());
            try{this.activity.loader(false);}catch(e){}
            load(false);
            timer=setInterval(function(){if(!dead)load(false);},180000);
            return root;
        };
        this.render=function(){return root;};
        function off(){try{Lampa.Controller.remove(CTRL);}catch(e){}}
        this.start=function(){
            off();
            Lampa.Controller.add(CTRL,{
                toggle:function(){try{Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);}catch(e){}},
                up:function(){try{Navigator.move('up');}catch(e){}},
                down:function(){try{Navigator.move('down');}catch(e){}},
                left:function(){try{Navigator.move('left');}catch(e){}},
                right:function(){try{Navigator.move('right');}catch(e){}},
                enter:function(){var a=root.find('.selector.focus').first();if(a.length)a.trigger('hover:enter');},
                ok:function(){var a=root.find('.selector.focus').first();if(a.length)a.trigger('hover:enter');},
                back:function(){off();Lampa.Activity.backward();}
            });
            Lampa.Controller.toggle(CTRL);
        };
        this.back=function(){off();Lampa.Activity.backward();};
        this.pause=off;this.stop=off;
        this.destroy=function(){dead=true;if(timer)clearInterval(timer);off();try{scroll.destroy();}catch(e){}root.remove();};
    }
    function openSport(){
        try{Lampa.Activity.push({url:'y7://sport/1.1.7',title:'Y7 Спорт',component:COMPONENT,page:1});}
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
        window.Y7Sport={version:VERSION,open:openSport,refresh:function(){cacheTime=0;},feedUrl:FEED,isWatching:sportIsWatching};
    }
    boot();
})();
