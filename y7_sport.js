/*
 * Y7 SPORT / Football First 1.0.0
 * Separate Lampa / LG webOS extension: no changes to 1.js, Lampac or Y7 Gateway.
 * Uses static, automatically refreshed public match metadata from GitHub Pages.
 * LiveTV: event page navigation only. It does not bypass DRM, paywalls or ads.
 * Authorized public direct HLS/MP4/DASH streams may be supplied in sport_channels.json.
 */
(function(){
    'use strict';
    var VERSION='1.0.0',KEY='__Y7_SPORT_FOOTBALL_100__';
    if(window[KEY])return;
    window[KEY]=true;
    var COMPONENT='y7_sport_100',CTRL='y7_sport_100_ctrl';
    var BASE='https://yuroc7.github.io/lamp/';
    var FEED=BASE+'y7_sport_feed.json';
    var STORE='y7_sport_feed_100';
    var ICON='<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3ZM5 7l3 3M19 7l-3 3M6 17l3-2M18 17l-3-2"/></svg>';
    var SERVICES=[
        {id:'suspilne',name:'Суспільне Спорт',category:'ua',cost:'free',url:'https://suspilne.media/sport/schedule/live/',note:'Українські безкоштовні трансляції; доступність конкретних подій залежить від прав.'},
        {id:'fifaplus',name:'FIFA+',category:'football',cost:'free_limited',url:'https://www.plus.fifa.com/',note:'Окремі футбольні матчі й архів; можливі геообмеження.'},
        {id:'uefatv',name:'UEFA.tv',category:'football',cost:'free_limited',url:'https://www.uefa.tv/',note:'Молодіжний та жіночий футбол, огляди. Основна чоловіча ЛЧ наживо тут не йде.'},
        {id:'eurovision',name:'Eurovision Sport',category:'multi',cost:'free_limited',url:'https://eurovisionsport.com/en',note:'Великий вибір видів спорту; безкоштовні ефіри, геообмеження.'},
        {id:'redbull',name:'Red Bull TV',category:'multi',cost:'free',url:'https://www.redbull.com/int-en/live-events/',note:'Автоспорт та екстремальні дисципліни.'},
        {id:'athletics',name:'World Athletics+',category:'athletics',cost:'free_limited',url:'https://worldathletics.org/watch/plus',note:'Легка атлетика, окремі безкоштовні ефіри.'},
        {id:'rugby',name:'RugbyPass TV',category:'rugby',cost:'free_limited',url:'https://rugbypass.tv/',note:'Регбі наживо й архів, реєстрація може бути потрібна.'},
        {id:'suspilnetv',name:'Суспільне Спорт · канал наживо',category:'ua',cost:'free',url:'https://suspilne.media/sport/schedule/tv/',note:'Офіційна сторінка прямого ефіру українського телеканалу.'},
        {id:'allsportdb',name:'AllSportDB Live',category:'schedule',cost:'free',url:'https://live.allsportdb.com/',note:'Розклад спортивних трансляцій з переходами на мовників.'},
        {id:'megogo',name:'MEGOGO Футбол',category:'football',cost:'paid',url:'https://megogo.net/ua/sport',note:'Чоловіча Ліга чемпіонів в Україні за передплатою.'}
    ];
    var TABS=[
        {id:'today',name:'Сьогодні'},
        {id:'europe',name:'Єврокубки'},
        {id:'ua',name:'Українські'},
        {id:'livetv',name:'LiveTV'},
        {id:'free',name:'Безкоштовно'},
        {id:'streams',name:'Мої канали'},
        {id:'all',name:'Усі сервіси'}
    ];
    var fallback={schema:1,updated_at:'2026-11-03T17:10:00Z',fixtures:[
        {id:'shakhtar_sporting_20261103',league:'ucl',competition:'Ліга чемпіонів',home:'Шахтар',away:'Спортінг',kickoff:'2026-11-03T17:45:00Z',status:'scheduled',important:true,
          broadcast:{name:'MEGOGO Футбол Перший',cost:'paid',url:'https://megogo.net/ua/sport/28488016-shakhtar-sportinh.html'},
          livetv_url:'https://livetv.sx/eventinfo/399041287_shahter_sporting/' }
        ],livetv:[{id:'399041287',title:'Шахтар — Спортінг',url:'https://livetv.sx/eventinfo/399041287_shahter_sporting/',sport:'football',playable:false}],
        services:SERVICES,channels:[],health:{}};
    var memory=null,cacheTime=0,requesting=false;
    function notify(s){try{Lampa.Noty.show('Y7 Спорт: '+s);}catch(e){}}
    function safeUrl(s){
        s=String(s||'').trim();
        if(!/^https:\/\//i.test(s)||s.length>3000)return '';
        try{var x=new URL(s);if(x.username||x.password)return '';if(!/^[a-z0-9.-]+$/i.test(x.hostname))return '';return s;}catch(e){return '';}
    }
    function mediaUrl(url){return safeUrl(url)&&/\.(?:m3u8|mp4|mpd)(?:\?|$)/i.test(url);}
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
    function statusText(m){return m.status==='live'?'● LIVE':m.status==='finished'?'ЗАВЕРШЕНО':'АНОНС';}
    function ageLabel(feed){
        if(!feed.updated_at)return 'Розклад очікує першого завантаження';
        var age=Date.now()-Date.parse(feed.updated_at);
        if(isNaN(age))return 'Час оновлення невідомий';
        var mins=Math.max(0,Math.round(age/60000));
        return mins>60?'Дані застарілі · '+Math.floor(mins/60)+' год тому':'Оновлено '+mins+' хв тому';
    }
    function style(){
        if(document.getElementById('y7-sport-style-100'))return;
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
        '.y7s-card{background:#fff;color:#123;padding:1.7em;text-align:center;border-radius:1em;max-width:90vw}';
        var n=document.createElement('style');n.id='y7-sport-style-100';n.textContent=css;
        (document.head||document.documentElement).appendChild(n);
    }
    function qr(url,title){
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
            function close(){document.removeEventListener('keydown',key,true);overlay.remove();try{Lampa.Controller.toggle(CTRL);}catch(e){}}
            function key(e){var k=e.keyCode;if(k===13||k===27||k===461||e.key==='Escape'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();close();}}
            document.addEventListener('keydown',key,true);
            overlay.on('click',function(e){e.preventDefault();close();});
        }catch(e){notify('не вдалося відкрити QR');}
    }
    function openExternal(url,title){
        url=safeUrl(url);if(!url)return notify('немає коректної адреси');
        var list=[{title:'Відкрити на TV',value:'tv'},{title:'Показати QR для телефона',value:'qr'}];
        function picked(item){
            try{Lampa.Select.close();}catch(e){}
            if(!item||item.value==='qr')return qr(url,title);
            var ok=false;
            try{if(Lampa.Utils&&Lampa.Utils.openURL){Lampa.Utils.openURL(url);ok=true;}}catch(e){}
            if(!ok){try{window.open(url,'_blank');ok=true;}catch(e){}}
            if(!ok)qr(url,title);
        }
        try{Lampa.Select.show({title:title||'Відкрити',items:list,onSelect:picked,onBack:function(){Lampa.Controller.toggle(CTRL);}});}
        catch(e){qr(url,title);}
    }
    function options(title,items){
        items=items.filter(function(v){return safeUrl(v.url);});
        if(!items.length)return notify('Доступних посилань немає');
        try{
            Lampa.Select.show({title:title,items:items.map(function(it,i){return {title:it.label,value:String(i)};}),
                onSelect:function(selected){var item=items[parseInt(selected.value,10)];
                    try{Lampa.Select.close();}catch(e){}
                    if(item){if(item.play&&mediaUrl(item.url)){playStream(item.url,title);}else openExternal(item.url,item.label);}
                },onBack:function(){Lampa.Controller.toggle(CTRL);}});
        }catch(e){openExternal(items[0].url,items[0].label);}
    }
    function playStream(url,title){
        if(!mediaUrl(url))return notify('Дозволені лише прямі HLS, MP4, DASH');
        try{
            if(!Lampa.Player||!Lampa.Player.play)throw Error('player unavailable');
            Lampa.Player.play({title:title,url:url,quality:'auto'});
        }catch(e){notify('плеєр недоступний; спробуй відкрити посилання');}
    }
    function fixtureOptions(m){
        var title=(m.home||'')+' — '+(m.away||'');
        var items=[];
        if(m.broadcast&&safeUrl(m.broadcast.url))items.push({label:(m.broadcast.name||'Офіційний мовник')+' · '+(m.broadcast.cost==='paid'?'передплата':'за умовами сервісу'),url:m.broadcast.url});
        if(safeUrl(m.livetv_url))items.push({label:'LiveTV · сторінка матчу, зовнішні посилання',url:m.livetv_url});
        items.push({label:'UEFA.tv · огляди, архів, окремі безкоштовні матчі',url:'https://www.uefa.tv/'});
        options(title,items);
    }
    function filterFixtures(f,tab){
        var now=Date.now(),today=kyivDate(new Date());
        var arr=(f.fixtures||[]).filter(function(x){
            var tm=Date.parse(x.kickoff);if(isNaN(tm))return false;
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
        return arr.slice(0,70);
    }
    function Sport(){
        var self=this,root=$('<div class="y7s-root"></div>'),scroll=new Lampa.Scroll({mask:false,over:true,nopadding:true}),body=$('<div class="y7s-content"></div>');
        var feed=memory||fallback,tab='today',last=null,dead=false,timer=0,error='';
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
            hero.append($('<div class="y7s-sub"></div>').text('Ліга чемпіонів · Ліга Європи · Ліга конференцій · українські клуби · безкоштовний спорт'));
            hero.append($('<div class="y7s-sub"></div>').text(ageLabel(feed)+(error?' · '+error:'')));
            body.append(hero);
            TABS.forEach(button);
            row('↻ Оновити матчі та посилання','Завантажити новий список з Y7 Sport (автооновлення кожні 20 хв).','ОНОВИТИ',function(){cacheTime=0;load(true);});
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
                section('Трансляції єврокубків');
                row('MEGOGO Футбол','Офіційні матчі ЛЧ в Україні, за передплатою.','ПЛАТНО',function(){openExternal('https://megogo.net/ua/sport','MEGOGO Футбол');});
                row('LiveTV · футбольний календар','Матчі, зовнішні сторінки з посиланнями. Не гарантія прямого відео.','СТОРІНКИ',function(){changeTab('livetv');});
            }else if(tab==='livetv'){
                section('LiveTV · сторінки футбольних матчів');
                row('Відкрити головну LiveTV','Неперевірений агрегатор. Посилання на зовнішні плеєри можуть змінюватися.','САЙТ',function(){openExternal('https://livetv.sx/','LiveTV');});
                var events=(feed.livetv||[]).slice(0,85);
                if(!events.length)row('Список поки порожній','LiveTV може тимчасово блокувати автоматичне зчитування; відкрий сайт.','','');
                events.forEach(function(e){
                    var label=(typeof e.browser_options==='number'&&e.browser_options>0)?('Описано '+e.browser_options+' браузерних варіантів (не перевірені)'):'Сторінка події · без перевіреного відеопотоку';
                    row(e.title||'Матч',label,'ВІДКРИТИ',function(){openExternal(e.url,e.title||'LiveTV');});
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
                var streams=feed.channels||[];
                if(!streams.length)row('Канали не додані','Безкоштовні відкриті офіційні потоки додаватимемо сюди.','','');
                streams.forEach(function(s){
                    if(s.authorized!==true||!mediaUrl(s.url))return;
                    row(s.title,s.note||s.provider||'Прямий відеопотік','▶ PLAY',function(){playStream(s.url,s.title);});
                });
            }
            section('Доступ та якість');
            body.append($('<div class="y7s-sub"></div>').text('LiveTV використовується для навігації до сторінок матчів. Сторонні iframe, захищені плеєри й рекламні відеовставки не перетворюються на прямі потоки. Вбудовані відтворення можливі лише для відкритих дозволених HLS/MP4/DASH. Безкоштовність перевіряється окремо для кожної події.'));
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
        try{Lampa.Activity.push({url:'y7://sport/1.0.0',title:'Y7 Спорт',component:COMPONENT,page:1});}
        catch(e){notify('не вдалося відкрити модуль');}
    }
    function boot(){
        if(!window.Lampa||!Lampa.Component||!Lampa.Activity||!Lampa.Scroll||!window.jQuery){setTimeout(boot,450);return;}
        try{Lampa.Component.add(COMPONENT,Sport);}catch(e){notify('помилка реєстрації');return;}
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
        window.Y7Sport={version:VERSION,open:openSport,refresh:function(){cacheTime=0;},feedUrl:FEED};
    }
    boot();
})();
