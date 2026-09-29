/*
 * Y7 Kids Arcade for Lampa / Y7 Media
 * Version: 2.0.1
 *
 * 7 mini-games:
 *  - Зоряний забіг
 *  - Склади слово
 *  - Математичні зірки
 *  - Порахуй друзів
 *  - Пам'ять
 *  - Кольори та форми
 *  - Робо-лабіринт
 *
 * Voice: browser SpeechSynthesis (uk-UA preferred), with WebAudio fallback.
 * Art: local Canvas vector drawings; no external images.
 */
(function(){
    'use strict';

    var VERSION='2.0.1';
    var COMPONENT='y7_kids_arcade';
    var SETTINGS_COMPONENT='y7_kids_arcade_settings';
    var READY='__Y7_KIDS_ARCADE_201__';
    var STORAGE='y7_kids_arcade_v2';
    if(window[READY]) return;
    window[READY]=true;

    var ICON='<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
        '<path d="M7 8h10a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-1.5l-2-2h-3l-2 2H7a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="1.8"/>'+
        '<path d="M8 11v4M6 13h4M16.3 11.5h.01M18.4 14h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
        '<path d="M9 5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    var HEROES=[
        {id:'sponge',name:'SpongeBob',ua:'СпанчБоб',kind:'sponge',c:'#f5db3d',a:'#7b542f'},
        {id:'patrick',name:'Patrick',ua:'Патрік',kind:'patrick',c:'#f28ca6',a:'#78c85c'},
        {id:'gary',name:'Gary',ua:'Гері',kind:'gary',c:'#6dcbe8',a:'#ec79b4'},
        {id:'karen',name:'Karen',ua:'Карен',kind:'karen',c:'#78e1c6',a:'#445c95'},
        {id:'tralalero',name:'Tralalero',ua:'Тралалеро',kind:'tralalero',c:'#4aa8d8',a:'#ef4e4e'},
        {id:'among',name:'Among Us',ua:'Амонг Ас',kind:'among',c:'#e84242',a:'#72d6ff'},
        {id:'astro',name:'Astro Bot',ua:'Астро Бот',kind:'astro',c:'#f4f7fb',a:'#3a9cff'},
        {id:'walle',name:'WALL·E',ua:'ВАЛЛ-І',kind:'walle',c:'#dca92e',a:'#5f6a6f'},
        {id:'eve',name:'EVE',ua:'Єва',kind:'eve',c:'#f7f9ff',a:'#4ca5ff'},
        {id:'sprunki_g',name:'Sprunki Green',ua:'Спрункі зелений',kind:'sprunki',c:'#85d249',a:'#2f7440'},
        {id:'sprunki_o',name:'Sprunki Orange',ua:'Спрункі помаранчевий',kind:'sprunki',c:'#f5a33a',a:'#8f4e18'},
        {id:'sprunki_p',name:'Sprunki Pink',ua:'Спрункі рожевий',kind:'sprunki',c:'#f27dc3',a:'#8f3e7d'},
        {id:'sprunki_b',name:'Sprunki Blue',ua:'Спрункі синій',kind:'sprunki',c:'#53b9ee',a:'#215e87'},
        {id:'vladi',name:'Vladi',ua:'Владі',kind:'vladi',c:'#8357d9',a:'#49d7ca'}
    ];

    var GAMES=[
        {id:'dash',title:'Зоряний забіг',sub:'Рух, реакція, увага',accent:'#62a8ff'},
        {id:'syllables',title:'Склади слово',sub:'Читання по складах',accent:'#79d477'},
        {id:'math',title:'Математичні зірки',sub:'Додавання й віднімання',accent:'#ffd45d'},
        {id:'count',title:'Порахуй друзів',sub:'Рахування від 1 до 20',accent:'#ff9c63'},
        {id:'memory',title:'Пам’ять',sub:'Знайди однакові пари',accent:'#c289ff'},
        {id:'shapes',title:'Кольори та форми',sub:'Для наймолодших',accent:'#ff86bd'},
        {id:'maze',title:'Робо-лабіринт',sub:'Логіка й напрямки',accent:'#6fd8db'}
    ];

    var WORDS=[
        {w:'МАМА',s:['МА','МА']},{w:'ТАТО',s:['ТА','ТО']},{w:'РИБА',s:['РИ','БА']},
        {w:'МОРЕ',s:['МО','РЕ']},{w:'КОТИК',s:['КО','ТИК']},{w:'КНИГА',s:['КНИ','ГА']},
        {w:'ВІКНО',s:['ВІК','НО']},{w:'БАНАН',s:['БА','НАН']},{w:'РОБОТ',s:['РО','БОТ']},
        {w:'РАКЕТА',s:['РА','КЕ','ТА']},{w:'МАШИНА',s:['МА','ШИ','НА']},
        {w:'СОБАКА',s:['СО','БА','КА']},{w:'КАЛИНА',s:['КА','ЛИ','НА']},
        {w:'ХМАРА',s:['ХМА','РА']},{w:'ЗІРКА',s:['ЗІР','КА']},{w:'ЛІТАК',s:['ЛІ','ТАК']}
    ];

    var COLORS=[
        {n:'червоне',c:'#ed5454'},{n:'синє',c:'#4f99ee'},{n:'зелене',c:'#70c66b'},
        {n:'жовте',c:'#f1cf4f'},{n:'рожеве',c:'#ed83be'},{n:'фіолетове',c:'#9c74e8'}
    ];
    var SHAPES=[
        {id:'circle',n:'коло'},{id:'square',n:'квадрат'},{id:'triangle',n:'трикутник'}
    ];

    function defaults(){
        return {
            hero:'sponge',
            age:'5-7',
            voice:true,
            voiceRate:0.88,
            music:true,
            stars:0,
            best:{},
            correct:0,
            played:0
        };
    }
    function readState(){
        var d=defaults(),x=null;
        try{x=Lampa.Storage.get(STORAGE,null);}catch(e){}
        if(!x)try{x=JSON.parse(localStorage.getItem(STORAGE)||'null');}catch(e2){}
        x=x||{};
        Object.keys(x).forEach(function(k){d[k]=x[k];});
        d.best=d.best||{};
        return d;
    }
    function saveState(s){
        try{Lampa.Storage.set(STORAGE,s);return;}catch(e){}
        try{localStorage.setItem(STORAGE,JSON.stringify(s));}catch(e2){}
    }
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
    function pick(a){return a[Math.floor(Math.random()*a.length)];}
    function shuffle(a){
        a=a.slice();
        for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}
        return a;
    }

    function Arcade(object){
        var self=this;
        var root=$('<div class="y7a-root"><canvas class="y7a-canvas" width="1280" height="720"></canvas><div class="y7a-caption"></div></div>');
        var canvas=root.find('canvas')[0];
        var ctx=canvas.getContext('2d');
        var caption=root.find('.y7a-caption');
        var state=readState();
        var screen='hub';
        var hubIndex=0,heroIndex=Math.max(0,HEROES.findIndex(function(h){return h.id===state.hero;}));
        var game=null;
        var raf=0,last=0,dead=false;
        var audio=null,voiceCache=[],voiceReady=false;
        var speakTimer=0;

        function style(){
            if($('#y7-kids-arcade-style').length)return;
            $('<style id="y7-kids-arcade-style">'+
              '.y7a-root{position:relative;width:100%;height:100%;overflow:hidden;background:#08101d;box-sizing:border-box}'+
              '.y7a-canvas{display:block;width:100%;height:100%;object-fit:contain;background:#08101d}'+
              '.y7a-caption{position:absolute;left:50%;bottom:.65em;transform:translateX(-50%);max-width:88%;padding:.38em .75em;border-radius:.55em;background:rgba(0,0,0,.62);font-size:.72em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;pointer-events:none}'+
              '</style>').appendTo('body');
        }

        function ensureAudio(){
            try{
                var AC=window.AudioContext||window.webkitAudioContext;
                if(!audio&&AC)audio=new AC();
                if(audio&&audio.state==='suspended')audio.resume();
            }catch(e){}
        }
        function tone(freq,dur,vol,type){
            if(!state.music)return;
            try{
                ensureAudio();if(!audio)return;
                var o=audio.createOscillator(),g=audio.createGain();
                o.type=type||'sine';o.frequency.value=freq||440;g.gain.value=vol||0.028;
                o.connect(g);g.connect(audio.destination);o.start();
                g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+(dur||.08));
                o.stop(audio.currentTime+(dur||.09));
            }catch(e){}
        }
        function good(){
            tone(660,.07,.03);setTimeout(function(){tone(880,.10,.025);},65);
        }
        function bad(){tone(240,.12,.025,'triangle');}
        function startSound(){tone(440,.05,.025);setTimeout(function(){tone(620,.06,.025);},55);}

        function refreshVoices(){
            try{
                if(!window.speechSynthesis)return;
                voiceCache=speechSynthesis.getVoices()||[];
                voiceReady=!!voiceCache.length;
            }catch(e){}
        }
        refreshVoices();
        try{if(window.speechSynthesis)window.speechSynthesis.onvoiceschanged=refreshVoices;}catch(e){}

        function voice(){
            if(!voiceCache.length)refreshVoices();
            var v=null,i;
            for(i=0;i<voiceCache.length;i++)if(/^uk/i.test(voiceCache[i].lang||'')){v=voiceCache[i];break;}
            if(!v)for(i=0;i<voiceCache.length;i++)if(/^ru/i.test(voiceCache[i].lang||'')){v=voiceCache[i];break;}
            return v||voiceCache[0]||null;
        }
        function say(text,force){
            text=String(text||'').trim();
            caption.text(text);
            if(!text||(!state.voice&&!force))return;
            try{
                if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){tone(520,.05,.015);return;}
                clearTimeout(speakTimer);
                speakTimer=setTimeout(function(){
                    try{
                        speechSynthesis.cancel();
                        var u=new SpeechSynthesisUtterance(text);
                        var v=voice();if(v)u.voice=v;
                        u.lang=(v&&v.lang)||'uk-UA';
                        u.rate=clamp(parseFloat(state.voiceRate)||.88,.65,1.2);
                        u.pitch=1.05;u.volume=.9;
                        speechSynthesis.speak(u);
                    }catch(e){}
                },60);
            }catch(e){}
        }

        function rr(x,y,w,h,r,fill,stroke,lw){
            r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
            if(fill){ctx.fillStyle=fill;ctx.fill();}
            if(stroke){ctx.lineWidth=lw||2;ctx.strokeStyle=stroke;ctx.stroke();}
        }
        function text(t,x,y,size,color,align,weight){
            ctx.save();ctx.font=(weight||700)+' '+size+'px system-ui,Segoe UI,Arial';
            ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillStyle=color||'#fff';
            ctx.fillText(String(t),x,y);ctx.restore();
        }
        function bg(){
            var g=ctx.createLinearGradient(0,0,1280,720);
            g.addColorStop(0,'#101c38');g.addColorStop(.5,'#10162b');g.addColorStop(1,'#07101b');
            ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
            ctx.globalAlpha=.12;ctx.fillStyle='#fff';
            for(var i=0;i<38;i++){var x=(i*191+37)%1280,y=(i*103+61)%720;ctx.beginPath();ctx.arc(x,y,1+(i%3),0,Math.PI*2);ctx.fill();}
            ctx.globalAlpha=1;
        }
        function hero(){return HEROES[heroIndex]||HEROES[0];}

        function drawHero(h,x,y,s){
            h=h||HEROES[0];
            ctx.save();ctx.translate(x,y);
            var c=h.c,a=h.a,k=h.kind;

            if(k==='sponge'){
                rr(-s*.34,-s*.37,s*.68,s*.65,s*.05,c);
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.11,-s*.12,s*.10,0,7);ctx.arc(s*.11,-s*.12,s*.10,0,7);ctx.fill();
                ctx.fillStyle='#48a6df';ctx.beginPath();ctx.arc(-s*.11,-s*.12,s*.045,0,7);ctx.arc(s*.11,-s*.12,s*.045,0,7);ctx.fill();
                rr(-s*.34,s*.16,s*.68,s*.11,0,'#fff');rr(-s*.34,s*.27,s*.68,s*.12,0,a);
                ctx.strokeStyle=a;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,s*.02,s*.14,.1,Math.PI-.1);ctx.stroke();
            }else if(k==='patrick'){
                ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,-s*.46);ctx.lineTo(s*.13,-s*.13);ctx.lineTo(s*.40,-s*.04);ctx.lineTo(s*.18,s*.13);ctx.lineTo(s*.28,s*.43);ctx.lineTo(0,s*.23);ctx.lineTo(-s*.28,s*.43);ctx.lineTo(-s*.18,s*.13);ctx.lineTo(-s*.40,-s*.04);ctx.lineTo(-s*.13,-s*.13);ctx.closePath();ctx.fill();
                rr(-s*.24,s*.13,s*.48,s*.17,s*.04,a);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.08,-s*.12,s*.045,0,7);ctx.arc(s*.08,-s*.12,s*.045,0,7);ctx.fill();
            }else if(k==='gary'){
                ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,s*.12,s*.34,s*.16,0,0,7);ctx.fill();
                ctx.strokeStyle='#d4ecff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-s*.15,0);ctx.lineTo(-s*.16,-s*.25);ctx.moveTo(s*.05,0);ctx.lineTo(s*.07,-s*.26);ctx.stroke();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.16,-s*.28,s*.07,0,7);ctx.arc(s*.07,-s*.29,s*.07,0,7);ctx.fill();
                ctx.fillStyle='#223';ctx.beginPath();ctx.arc(-s*.16,-s*.28,s*.027,0,7);ctx.arc(s*.07,-s*.29,s*.027,0,7);ctx.fill();
                ctx.fillStyle=a;ctx.beginPath();ctx.arc(s*.14,s*.05,s*.23,0,7);ctx.fill();ctx.strokeStyle='#7c3a78';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s*.14,s*.05,s*.13,0,Math.PI*1.65);ctx.stroke();
            }else if(k==='karen'){
                rr(-s*.34,-s*.30,s*.68,s*.50,s*.05,'#a5b5c9');rr(-s*.27,-s*.23,s*.54,s*.35,s*.03,'#14273f');
                ctx.strokeStyle=c;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-s*.18,-s*.03);ctx.lineTo(-s*.08,-s*.10);ctx.lineTo(s*.02,s*.02);ctx.lineTo(s*.18,-s*.08);ctx.stroke();
                rr(-s*.17,s*.23,s*.34,s*.08,s*.03,a);ctx.strokeStyle='#a5b5c9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-s*.19,s*.31);ctx.lineTo(-s*.27,s*.42);ctx.moveTo(s*.19,s*.31);ctx.lineTo(s*.27,s*.42);ctx.stroke();
            }else if(k==='tralalero'){
                ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-s*.42,0);ctx.quadraticCurveTo(0,-s*.32,s*.34,-s*.11);ctx.lineTo(s*.48,-s*.28);ctx.lineTo(s*.38,0);ctx.lineTo(s*.48,s*.18);ctx.quadraticCurveTo(0,s*.27,-s*.42,0);ctx.fill();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*.15,-s*.08,s*.04,0,7);ctx.fill();
                rr(-s*.28,s*.18,s*.25,s*.10,s*.04,a);rr(s*.03,s*.18,s*.25,s*.10,s*.04,a);
            }else if(k==='among'){
                rr(-s*.27,-s*.33,s*.50,s*.60,s*.18,c);rr(s*.04,-s*.22,s*.28,s*.22,s*.08,a);
                rr(-s*.38,-s*.10,s*.15,s*.32,s*.05,'#a52d2d');rr(-s*.22,s*.18,s*.14,s*.22,s*.04,c);rr(s*.05,s*.18,s*.14,s*.22,s*.04,c);
            }else if(k==='astro'){
                rr(-s*.30,-s*.31,s*.60,s*.56,s*.18,c);rr(-s*.22,-s*.21,s*.44,s*.25,s*.09,'#17233d');
                ctx.fillStyle=a;ctx.beginPath();ctx.arc(-s*.08,-s*.09,s*.035,0,7);ctx.arc(s*.08,-s*.09,s*.035,0,7);ctx.fill();
                rr(-s*.20,s*.24,s*.14,s*.18,s*.06,c);rr(s*.06,s*.24,s*.14,s*.18,s*.06,c);
                ctx.strokeStyle=a;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-s*.31);ctx.lineTo(0,-s*.43);ctx.stroke();ctx.fillStyle=a;ctx.beginPath();ctx.arc(0,-s*.45,s*.04,0,7);ctx.fill();
            }else if(k==='walle'){
                rr(-s*.31,-s*.19,s*.62,s*.48,s*.06,c);ctx.fillStyle='#253038';
                ctx.beginPath();ctx.arc(-s*.12,-s*.31,s*.09,0,7);ctx.arc(s*.12,-s*.31,s*.09,0,7);ctx.fill();
                ctx.fillStyle='#8ed8ff';ctx.beginPath();ctx.arc(-s*.12,-s*.31,s*.035,0,7);ctx.arc(s*.12,-s*.31,s*.035,0,7);ctx.fill();
                rr(-s*.39,s*.20,s*.14,s*.19,s*.04,a);rr(s*.25,s*.20,s*.14,s*.19,s*.04,a);
                ctx.fillStyle='#362f22';for(var i=0;i<3;i++)ctx.fillRect(-s*.21+i*s*.14,-s*.03,s*.08,s*.08);
            }else if(k==='eve'){
                ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,s*.27,s*.39,0,0,7);ctx.fill();
                rr(-s*.22,-s*.18,s*.44,s*.19,s*.09,'#15233d');
                ctx.fillStyle=a;ctx.beginPath();ctx.ellipse(0,-s*.09,s*.11,s*.025,0,0,7);ctx.fill();
                ctx.fillStyle='#c7d0dc';ctx.beginPath();ctx.ellipse(0,s*.33,s*.13,s*.03,0,0,7);ctx.fill();
            }else if(k==='sprunki'){
                ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,s*.30,0,7);ctx.fill();
                ctx.beginPath();ctx.moveTo(-s*.20,-s*.21);ctx.lineTo(-s*.31,-s*.46);ctx.lineTo(-s*.03,-s*.31);ctx.fill();
                ctx.beginPath();ctx.moveTo(s*.20,-s*.21);ctx.lineTo(s*.31,-s*.46);ctx.lineTo(s*.03,-s*.31);ctx.fill();
                ctx.fillStyle='#101820';ctx.beginPath();ctx.arc(-s*.10,-s*.05,s*.04,0,7);ctx.arc(s*.10,-s*.05,s*.04,0,7);ctx.fill();
                ctx.strokeStyle=a;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,s*.07,s*.12,.12,Math.PI-.12);ctx.stroke();
            }else{
                rr(-s*.29,-s*.33,s*.58,s*.60,s*.16,c);rr(-s*.19,-s*.17,s*.38,s*.15,s*.07,a);
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.07,-s*.10,s*.03,0,7);ctx.arc(s*.07,-s*.10,s*.03,0,7);ctx.fill();
                rr(-s*.23,s*.26,s*.16,s*.16,s*.04,'#151827');rr(s*.07,s*.26,s*.16,s*.16,s*.04,'#151827');
            }
            ctx.restore();
        }

        function drawTop(title,sub){
            text(title,48,46,29,'#fff','left',900);
            text(sub||'',48,79,14,'#a9b7d6','left',600);
            drawHero(hero(),1180,58,74);
            text('★ '+(state.stars||0),1070,50,18,'#ffd65e','right',900);
        }

        function hubCards(){
            var a=[];
            for(var i=0;i<GAMES.length;i++)a.push({type:'game',game:GAMES[i]});
            a.push({type:'hero',title:'Обрати героя',sub:hero().ua,accent:'#75c7ff'});
            a.push({type:'settings',title:'Налаштування',sub:'Вік, голос, звук',accent:'#9da9bd'});
            return a;
        }

        function drawGameIcon(id,x,y,s,c){
            ctx.save();ctx.translate(x,y);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
            if(id==='dash'){for(var i=0;i<5;i++){var a=-Math.PI/2+i*4*Math.PI/5;ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);}ctx.closePath();ctx.stroke();}
            else if(id==='syllables'){rr(-s,-s*.65,s*2,s*1.3,s*.15,null,c,5);text('АБ',0,2,s*.65,c,'center',900);}
            else if(id==='math'){text('2+3',0,0,s*.65,c,'center',900);}
            else if(id==='count'){for(var q=0;q<5;q++){ctx.beginPath();ctx.arc((q-2)*s*.45,((q%2)*2-1)*s*.28,s*.14,0,7);ctx.fill();}}
            else if(id==='memory'){rr(-s,-s*.65,s*.8,s*1.3,s*.12,null,c,5);rr(s*.2,-s*.65,s*.8,s*1.3,s*.12,null,c,5);}
            else if(id==='shapes'){ctx.beginPath();ctx.arc(-s*.45,0,s*.28,0,7);ctx.stroke();ctx.strokeRect(s*.08,-s*.28,s*.56,s*.56);}
            else if(id==='maze'){for(var m=0;m<4;m++){ctx.beginPath();ctx.moveTo(-s+m*s*.55,-s*.7);ctx.lineTo(-s+m*s*.55,s*.7);ctx.stroke();}}
            ctx.restore();
        }

        function drawHub(){
            bg();drawTop('Y7 ІГРИ','Міні-ігри для TV · без реклами · локально');
            var cards=hubCards(),cols=3,w=360,h=150,gx=34,gy=22,sx=70,sy=118;
            for(var i=0;i<cards.length;i++){
                var c=cards[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+gx),y=sy+row*(h+gy),sel=i===hubIndex;
                rr(x,y,w,h,18,sel?'rgba(68,105,245,.92)':'rgba(255,255,255,.055)',sel?'#a9bdff':'rgba(255,255,255,.07)',2);
                var title=c.type==='game'?c.game.title:c.title,sub=c.type==='game'?c.game.sub:c.sub,ac=c.type==='game'?c.game.accent:c.accent;
                if(c.type==='game')drawGameIcon(c.game.id,x+62,y+74,33,ac);
                else if(c.type==='hero')drawHero(hero(),x+62,y+75,78);
                else{ctx.strokeStyle=ac;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x+62,y+74,29,0,7);ctx.stroke();text('⚙',x+62,y+75,28,ac,'center',700);}
                text(title,x+118,y+57,21,'#fff','left',800);text(sub,x+118,y+91,13,'#bdc6da','left',600);
                if(c.type==='game'){var b=state.best[c.game.id]||0;text('Рекорд '+b,x+118,y+121,12,'#82dfa2','left',700);}
            }
            text('Стрілки — вибір · OK — відкрити · Назад — вихід',640,687,16,'#9eabc6','center',600);
        }

        function drawHeroes(){
            bg();drawTop('ОБЕРИ ГЕРОЯ','Герой буде супроводжувати в усіх міні-іграх');
            var cols=5,w=210,h=154,g=24,sx=70,sy=115;
            for(var i=0;i<HEROES.length;i++){
                var hro=HEROES[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+g),y=sy+row*(h+g),sel=i===heroIndex;
                rr(x,y,w,h,18,sel?'rgba(68,105,245,.94)':'rgba(255,255,255,.055)',sel?'#a9bdff':'rgba(255,255,255,.07)',2);
                drawHero(hro,x+105,y+61,90);text(hro.ua,x+105,y+125,15,'#fff','center',800);
            }
            text('OK — обрати · Назад — до ігор',640,688,16,'#9eabc6','center',600);
        }

        function drawSettings(){
            bg();drawTop('НАЛАШТУВАННЯ ІГОР','Зберігаються тільки на цьому TV');
            var rows=[
                {n:'Вік / складність',v:state.age},
                {n:'Озвучення',v:state.voice?'Увімкнено':'Вимкнено'},
                {n:'Звуки',v:state.music?'Увімкнено':'Вимкнено'},
                {n:'Швидкість голосу',v:(Math.round((state.voiceRate||.88)*100))+'%'},
                {n:'Скинути прогрес',v:'OK двічі'}
            ];
            var idx=game&&game.settingsIndex||0;
            for(var i=0;i<rows.length;i++){
                var y=155+i*82,sel=i===idx;rr(270,y,740,62,15,sel?'rgba(68,105,245,.92)':'rgba(255,255,255,.055)',sel?'#a9bdff':'rgba(255,255,255,.07)',2);
                text(rows[i].n,305,y+31,19,'#fff','left',750);text(rows[i].v,972,y+31,17,sel?'#fff':'#aeb9cf','right',750);
            }
            text('←/→ — змінити · OK — дія · Назад — до ігор',640,687,16,'#9eabc6','center',600);
        }

        // ---------- Common quiz helpers ----------
        function quizStart(kind){
            game={kind:kind,round:0,score:0,selected:0,feedback:'',locked:false};
            nextQuestion();
        }
        function ageMax(){
            if(state.age==='3-5')return 5;
            if(state.age==='5-7')return 10;
            return 20;
        }
        function choices(correct,min,max,count){
            var a=[correct],guard=0;
            while(a.length<(count||3)&&guard++<50){
                var x=ri(min,max);
                if(a.indexOf(x)<0)a.push(x);
            }
            return shuffle(a);
        }
        function markCorrect(points){
            game.score+=(points||1);state.stars+=(points||1);state.correct=(state.correct||0)+1;saveState(state);good();
        }
        function endQuiz(){
            state.played=(state.played||0)+1;
            state.best[game.kind]=Math.max(state.best[game.kind]||0,game.score||0);
            saveState(state);
            game.over=true;
            say('Молодець! Гра завершена. Твій результат '+game.score+'.');
        }
        function nextQuestion(){
            if(game.round>=10){endQuiz();return;}
            game.round++;game.selected=0;game.locked=false;game.feedback='';

            if(game.kind==='math'){
                var max=ageMax(),plus=(state.age==='3-5'||Math.random()<.62),a=ri(1,max),b=ri(1,max);
                if(!plus&&b>a){var t=a;a=b;b=t;}
                var ans=plus?a+b:a-b;
                game.q={a:a,b:b,op:plus?'+':'−',ans:ans,opts:choices(ans,0,max*2,3)};
                say('Скільки буде '+a+(plus?' плюс ':' мінус ')+b+'?');
            }else if(game.kind==='count'){
                var n=ri(1,ageMax());game.q={n:n,opts:choices(n,1,Math.max(5,ageMax()),3)};
                say('Порахуй друзів. Скільки їх?');
            }else if(game.kind==='syllables'){
                var pool=WORDS.filter(function(w){return state.age==='3-5'?w.s.length===2:true;});
                var wd=pick(pool),miss=ri(0,wd.s.length-1),correct=wd.s[miss],wrong=[];
                var syll=['МА','МО','МУ','ТА','ТО','РА','РЕ','КА','КО','ЛА','ЛИ','НА','НО','БА','БО','ТИК','ГА','ШИ','СО','КЕ','ЗІР'];
                while(wrong.length<2){var z=pick(syll);if(z!==correct&&wrong.indexOf(z)<0)wrong.push(z);}
                game.q={word:wd,miss:miss,correct:correct,opts:shuffle([correct].concat(wrong))};
                say('Склади слово '+wd.w.toLowerCase()+'. Який склад пропущено?');
            }else if(game.kind==='shapes'){
                var targetColor=pick(COLORS),targetShape=pick(SHAPES),items=[],correctIndex=ri(0,5);
                for(var i=0;i<6;i++){
                    if(i===correctIndex)items.push({c:targetColor,s:targetShape});
                    else{
                        var cc=pick(COLORS),ss=pick(SHAPES);
                        if(cc.n===targetColor.n&&ss.id===targetShape.id)cc=COLORS[(COLORS.indexOf(cc)+1)%COLORS.length];
                        items.push({c:cc,s:ss});
                    }
                }
                game.q={targetColor:targetColor,targetShape:targetShape,items:items,correctIndex:correctIndex};
                say('Знайди '+targetColor.n+' '+targetShape.n+'.');
            }
        }

        function answerQuiz(){
            if(!game||game.locked||game.over)return;
            var ok=false;
            if(game.kind==='math'||game.kind==='count')ok=game.q.opts[game.selected]===game.q.ans||game.q.opts[game.selected]===game.q.n;
            else if(game.kind==='syllables')ok=game.q.opts[game.selected]===game.q.correct;
            else if(game.kind==='shapes')ok=game.selected===game.q.correctIndex;
            game.locked=true;
            if(ok){markCorrect(2);game.feedback='Правильно!';say(pick(['Правильно! Молодець!','Супер! Правильна відповідь!','Чудово! Так тримати!']));}
            else{bad();game.feedback='Спробуй ще!';say(pick(['Майже. Спробуй ще раз.','Нічого страшного. Спробуй ще.','Подумай ще трішки.']));}
            setTimeout(function(){
                if(!game)return;
                if(ok){nextQuestion();}
                else{game.locked=false;game.feedback='';}
            },900);
        }

        function drawQuiz(){
            bg();
            var title=game.kind==='math'?'МАТЕМАТИЧНІ ЗІРКИ':game.kind==='count'?'ПОРАХУЙ ДРУЗІВ':game.kind==='syllables'?'СКЛАДИ СЛОВО':'КОЛЬОРИ ТА ФОРМИ';
            drawTop(title,'Раунд '+Math.min(game.round,10)+'/10 · Бал '+game.score);
            drawHero(hero(),170,340,150);

            if(game.over){
                text('ГРУ ЗАВЕРШЕНО',720,250,42,'#fff','center',900);text('Результат: '+game.score,720,330,31,'#ffd65e','center',900);
                text('OK — ще раз · Назад — до ігор',720,430,20,'#b9c6dd','center',700);return;
            }

            if(game.kind==='math'){
                text(game.q.a+' '+game.q.op+' '+game.q.b+' = ?',720,220,62,'#fff','center',900);
                drawChoiceRow(game.q.opts,720,390);
            }else if(game.kind==='count'){
                var n=game.q.n,cols=Math.min(5,n),sx=520,sy=190;
                for(var i=0;i<n;i++){var col=i%cols,row=Math.floor(i/cols);drawHero(HEROES[(heroIndex+i+1)%HEROES.length],sx+col*100,sy+row*105,64);}
                drawChoiceRow(game.q.opts,720,510);
            }else if(game.kind==='syllables'){
                var parts=game.q.word.s.slice();parts[game.q.miss]='?';
                text(parts.join(' - '),720,235,50,'#fff','center',900);text(game.q.word.w,720,300,20,'#8ea5cc','center',650);
                drawChoiceRow(game.q.opts,720,455);
            }else{
                text('Знайди: '+game.q.targetColor.n+' '+game.q.targetShape.n,720,165,28,'#fff','center',800);
                for(var s=0;s<game.q.items.length;s++){
                    var col=s%3,row=Math.floor(s/3),x=510+col*210,y=255+row*180,sel=s===game.selected,item=game.q.items[s];
                    rr(x,y,160,135,17,sel?'rgba(68,105,245,.9)':'rgba(255,255,255,.055)',sel?'#b3c2ff':'rgba(255,255,255,.07)',2);
                    drawShape(item.s.id,x+80,y+67,46,item.c.c);
                }
            }
            if(game.feedback)text(game.feedback,720,625,24,game.feedback==='Правильно!'?'#80e7a0':'#ffd06b','center',850);
        }
        function drawChoiceRow(opts,cx,y){
            var w=170,g=24,total=opts.length*w+(opts.length-1)*g,x=cx-total/2;
            for(var i=0;i<opts.length;i++){
                var sel=i===game.selected;rr(x+i*(w+g),y,w,92,18,sel?'rgba(68,105,245,.92)':'rgba(255,255,255,.06)',sel?'#b3c2ff':'rgba(255,255,255,.08)',2);
                text(opts[i],x+i*(w+g)+w/2,y+46,32,'#fff','center',900);
            }
        }
        function drawShape(id,x,y,s,c){
            ctx.save();ctx.fillStyle=c;ctx.strokeStyle='#fff';ctx.lineWidth=3;
            if(id==='circle'){ctx.beginPath();ctx.arc(x,y,s,0,7);ctx.fill();}
            else if(id==='square')rr(x-s,y-s,s*2,s*2,8,c);
            else{ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s,y+s);ctx.lineTo(x-s,y+s);ctx.closePath();ctx.fill();}
            ctx.restore();
        }

        // ---------- Memory ----------
        function memoryStart(){
            var pairCount=state.age==='3-5'?4:6;
            var pool=shuffle(HEROES).slice(0,pairCount),cards=[];
            for(var i=0;i<pool.length;i++){cards.push({h:pool[i],open:false,done:false});cards.push({h:pool[i],open:false,done:false});}
            game={kind:'memory',cards:shuffle(cards),selected:0,first:-1,matches:0,moves:0,locked:false,score:0};
            say('Знайди однакові пари.');
        }
        function memoryOpen(){
            if(game.locked)return;
            var c=game.cards[game.selected];if(c.done||c.open)return;
            c.open=true;
            if(game.first<0){game.first=game.selected;tone(520,.04,.02);return;}
            game.moves++;
            var a=game.cards[game.first],b=c,fi=game.first;game.first=-1;
            if(a.h.id===b.h.id){
                a.done=b.done=true;game.matches++;game.score+=3;state.stars+=3;good();say('Пара!');
                if(game.matches===game.cards.length/2){
                    state.best.memory=Math.max(state.best.memory||0,game.score);state.played++;saveState(state);game.over=true;say('Усі пари знайдено. Молодець!');
                }
            }else{
                bad();game.locked=true;setTimeout(function(){a.open=false;b.open=false;game.locked=false;},700);
            }
        }
        function drawMemory(){
            bg();drawTop('ПАМ’ЯТЬ','Пари '+game.matches+'/'+(game.cards.length/2)+' · Ходи '+game.moves);
            var n=game.cards.length,cols=n<=8?4:6,w=150,h=180,g=24,total=cols*w+(cols-1)*g,sx=(1280-total)/2,rows=Math.ceil(n/cols),sy=135;
            for(var i=0;i<n;i++){
                var c=game.cards[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+g),y=sy+row*(h+g),sel=i===game.selected;
                rr(x,y,w,h,18,sel?'rgba(68,105,245,.92)':c.done?'rgba(85,175,110,.28)':'rgba(255,255,255,.055)',sel?'#b3c2ff':'rgba(255,255,255,.08)',2);
                if(c.open||c.done){drawHero(c.h,x+w/2,y+76,96);text(c.h.ua,x+w/2,y+145,13,'#fff','center',750);}
                else{text('Y7',x+w/2,y+88,28,'#8da4cf','center',900);}
            }
            if(game.over)text('Готово! OK — ще раз · Назад — до ігор',640,665,20,'#8ee4a6','center',800);
        }

        // ---------- Maze ----------
        function mazeStart(){
            var W=9,H=6,grid=[],x,y;
            for(y=0;y<H;y++){grid[y]=[];for(x=0;x<W;x++)grid[y][x]=0;}
            // Hand-made connected path plus side obstacles.
            var blocks=[[2,0],[4,0],[6,0],[2,1],[6,1],[1,2],[4,2],[7,2],[1,3],[3,3],[5,3],[7,3],[3,4],[5,4],[1,5],[7,5]];
            for(var i=0;i<blocks.length;i++)grid[blocks[i][1]][blocks[i][0]]=1;
            game={kind:'maze',grid:grid,w:W,h:H,px:0,py:0,gx:8,gy:5,steps:0,score:0,over:false};
            say('Допоможи '+hero().ua+' дістатися до зірки.');
        }
        function mazeMove(dx,dy){
            if(game.over)return;
            var nx=game.px+dx,ny=game.py+dy;if(nx<0||ny<0||nx>=game.w||ny>=game.h)return;
            if(game.grid[ny][nx]){bad();say('Тут перешкода. Спробуй інший шлях.');return;}
            game.px=nx;game.py=ny;game.steps++;tone(470,.035,.015);
            if(nx===game.gx&&ny===game.gy){
                game.over=true;game.score=Math.max(1,30-game.steps);state.stars+=game.score;state.best.maze=Math.max(state.best.maze||0,game.score);state.played++;saveState(state);good();say('Ура! Зірку знайдено!');
            }
        }
        function drawMaze(){
            bg();drawTop('РОБО-ЛАБІРИНТ','Кроки '+game.steps+' · знайди зірку');
            var cw=92,ch=82,sx=225,sy=120;
            for(var y=0;y<game.h;y++)for(var x=0;x<game.w;x++){
                var px=sx+x*cw,py=sy+y*ch;rr(px,py,cw-7,ch-7,10,game.grid[y][x]?'rgba(75,83,105,.72)':'rgba(255,255,255,.045)','rgba(255,255,255,.055)',1);
                if(x===game.gx&&y===game.gy){text('★',px+42,py+38,35,'#ffd85c','center',900);}
            }
            drawHero(hero(),sx+game.px*cw+42,sy+game.py*ch+38,64);
            if(game.over)text('Молодець! +'+game.score+' ★ · OK — ще раз',640,660,20,'#8ee4a6','center',850);
        }

        // ---------- Dash ----------
        function dashStart(){
            game={kind:'dash',score:0,lives:state.age==='7+'?2:3,time:45,start:performance.now(),px:640,py:395,stars:[],bad:[],over:false,inv:0};
            for(var i=0;i<9;i++)dashSpawnStar();
            for(var j=0;j<(state.age==='3-5'?3:5);j++)dashSpawnBad();
            say('Збирай зірки та уникай перешкод. Уперед!');
            startSound();
        }
        function dashSpawnStar(){game.stars.push({x:ri(90,1190),y:ri(150,650),r:14});}
        function dashSpawnBad(){
            var sp=state.age==='3-5'?55:state.age==='5-7'?78:105;
            game.bad.push({x:ri(80,1200),y:ri(160,640),vx:(Math.random()<.5?-1:1)*ri(sp,sp+35),vy:ri(-35,35),r:ri(22,30)});
        }
        function dashMove(dx,dy){
            if(game.over)return;
            game.px=clamp(game.px+dx*54,55,1225);game.py=clamp(game.py+dy*54,120,665);
            dashHit(performance.now());
        }
        function d2(ax,ay,bx,by){var x=ax-bx,y=ay-by;return x*x+y*y;}
        function dashHit(now){
            for(var i=game.stars.length-1;i>=0;i--){
                var s=game.stars[i];if(d2(game.px,game.py,s.x,s.y)<2300){game.stars.splice(i,1);game.score+=2;state.stars+=2;good();dashSpawnStar();}
            }
            if(now<game.inv)return;
            for(var j=0;j<game.bad.length;j++){
                var b=game.bad[j];if(d2(game.px,game.py,b.x,b.y)<2700){game.lives--;game.inv=now+1100;bad();say('Обережно!');if(game.lives<=0)dashEnd();break;}
            }
        }
        function dashEnd(){
            if(game.over)return;game.over=true;state.best.dash=Math.max(state.best.dash||0,game.score);state.played++;saveState(state);say('Раунд завершено. Рахунок '+game.score+'.');
        }
        function dashUpdate(dt,now){
            if(game.over)return;
            game.time=Math.max(0,45-(now-game.start)/1000);if(game.time<=0){dashEnd();return;}
            for(var i=0;i<game.bad.length;i++){var b=game.bad[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<35||b.x>1245)b.vx*=-1;if(b.y<130||b.y>680)b.vy*=-1;}
            dashHit(now);
        }
        function drawDash(){
            bg();drawTop('ЗОРЯНИЙ ЗАБІГ','★ '+game.score+' · ♥ '+game.lives+' · '+Math.ceil(game.time)+' с');
            rr(28,105,1224,580,24,'rgba(255,255,255,.025)','rgba(255,255,255,.05)',2);
            for(var i=0;i<game.stars.length;i++)text('★',game.stars[i].x,game.stars[i].y,30,'#ffd75f','center',900);
            for(var j=0;j<game.bad.length;j++){var b=game.bad[j];rr(b.x-b.r,b.y-b.r,b.r*2,b.r*2,b.r*.45,'#553361');text('!',b.x,b.y,20,'#ff8acb','center',900);}
            ctx.globalAlpha=performance.now()<game.inv&&Math.floor(performance.now()/100)%2===0?.35:1;drawHero(hero(),game.px,game.py,86);ctx.globalAlpha=1;
            if(game.over){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,1280,720);text('РАУНД ЗАВЕРШЕНО',640,300,44,'#fff','center',900);text('Рахунок '+game.score,640,365,30,'#ffd75f','center',900);text('OK — ще раз · Назад — до ігор',640,455,19,'#c5cfe2','center',700);}
        }

        function startGame(id){
            ensureAudio();
            if(id==='dash')dashStart();
            else if(id==='memory')memoryStart();
            else if(id==='maze')mazeStart();
            else quizStart(id);
            screen='game';updateCaption();
        }

        function updateCaption(){
            if(screen==='hub')caption.text('Стрілки: вибір · OK: відкрити · Назад: вихід');
            else if(screen==='heroes')caption.text('Стрілки: герой · OK: обрати · Назад: до ігор');
            else if(screen==='settings')caption.text('←/→: змінити · Назад: до ігор');
            else caption.text('Стрілки: керування · OK: дія · Назад: до ігор');
        }

        function press(name){
            ensureAudio();

            if(screen==='hub'){
                var cards=hubCards(),cols=3;
                if(name==='left')hubIndex=(hubIndex+cards.length-1)%cards.length;
                if(name==='right')hubIndex=(hubIndex+1)%cards.length;
                if(name==='up')hubIndex=(hubIndex-cols+cards.length)%cards.length;
                if(name==='down')hubIndex=(hubIndex+cols)%cards.length;
                if(name==='ok'){
                    var c=cards[hubIndex];
                    if(c.type==='game')startGame(c.game.id);
                    else if(c.type==='hero'){screen='heroes';say('Обери героя.');}
                    else{screen='settings';game={settingsIndex:0,resetArmed:false};}
                }
                if(name==='back'){self.back();return;}
            }else if(screen==='heroes'){
                var colsH=5,n=HEROES.length;
                if(name==='left')heroIndex=(heroIndex+n-1)%n;
                if(name==='right')heroIndex=(heroIndex+1)%n;
                if(name==='up')heroIndex=(heroIndex-colsH+n)%n;
                if(name==='down')heroIndex=(heroIndex+colsH)%n;
                if(name==='ok'){state.hero=hero().id;saveState(state);good();say('Обрано '+hero().ua+'.');screen='hub';}
                if(name==='back')screen='hub';
            }else if(screen==='settings'){
                var idx=game.settingsIndex;
                if(name==='up')game.settingsIndex=(idx+4)%5;
                if(name==='down')game.settingsIndex=(idx+1)%5;
                if(name==='left'||name==='right'||name==='ok'){
                    idx=game.settingsIndex;
                    if(idx===0){
                        var ages=['3-5','5-7','7+'],ai=ages.indexOf(state.age);state.age=ages[(ai+(name==='left'?-1:1)+ages.length)%ages.length];saveState(state);say('Складність '+state.age);
                    }else if(idx===1){
                        state.voice=!state.voice;saveState(state);if(state.voice)say('Озвучення увімкнено.',true);
                    }else if(idx===2){
                        state.music=!state.music;saveState(state);if(state.music)good();
                    }else if(idx===3){
                        state.voiceRate=clamp((parseFloat(state.voiceRate)||.88)+(name==='left'?-.05:.05),.65,1.15);saveState(state);say('Швидкість голосу.',true);
                    }else if(idx===4&&name==='ok'){
                        if(game.resetArmed){state=defaults();saveState(state);heroIndex=0;game.resetArmed=false;good();say('Прогрес скинуто.',true);}
                        else{game.resetArmed=true;say('Натисни ОК ще раз, щоб скинути прогрес.',true);}
                    }
                }
                if(name==='back')screen='hub';
            }else if(screen==='game'){
                if(game.kind==='dash'){
                    if(game.over&&name==='ok'){dashStart();}
                    else if(name==='left')dashMove(-1,0);else if(name==='right')dashMove(1,0);else if(name==='up')dashMove(0,-1);else if(name==='down')dashMove(0,1);
                    if(name==='back')screen='hub';
                }else if(game.kind==='maze'){
                    if(game.over&&name==='ok')mazeStart();
                    else if(name==='left')mazeMove(-1,0);else if(name==='right')mazeMove(1,0);else if(name==='up')mazeMove(0,-1);else if(name==='down')mazeMove(0,1);
                    if(name==='back')screen='hub';
                }else if(game.kind==='memory'){
                    var cols=game.cards.length<=8?4:6,n=game.cards.length;
                    if(game.over&&name==='ok')memoryStart();
                    else{
                        if(name==='left')game.selected=(game.selected+n-1)%n;
                        if(name==='right')game.selected=(game.selected+1)%n;
                        if(name==='up')game.selected=(game.selected-cols+n)%n;
                        if(name==='down')game.selected=(game.selected+cols)%n;
                        if(name==='ok')memoryOpen();
                    }
                    if(name==='back')screen='hub';
                }else{
                    if(game.over&&name==='ok'){quizStart(game.kind);}
                    else if(!game.locked){
                        var cnt=game.kind==='shapes'?6:game.q.opts.length,colsQ=game.kind==='shapes'?3:cnt;
                        if(name==='left')game.selected=(game.selected+cnt-1)%cnt;
                        if(name==='right')game.selected=(game.selected+1)%cnt;
                        if(game.kind==='shapes'&&name==='up')game.selected=(game.selected-colsQ+cnt)%cnt;
                        if(game.kind==='shapes'&&name==='down')game.selected=(game.selected+colsQ)%cnt;
                        if(name==='ok')answerQuiz();
                    }
                    if(name==='back')screen='hub';
                }
            }
            updateCaption();
        }

        function draw(){
            if(screen==='hub')drawHub();
            else if(screen==='heroes')drawHeroes();
            else if(screen==='settings')drawSettings();
            else if(screen==='game'){
                if(game.kind==='dash')drawDash();
                else if(game.kind==='memory')drawMemory();
                else if(game.kind==='maze')drawMaze();
                else drawQuiz();
            }
        }

        function tick(now){
            if(dead)return;
            var dt=Math.min(.05,(now-last)/1000||0);last=now;
            if(screen==='game'&&game&&game.kind==='dash')dashUpdate(dt,now);
            draw();raf=requestAnimationFrame(tick);
        }

        this.create=function(){style();updateCaption();last=performance.now();raf=requestAnimationFrame(tick);};
        this.render=function(){return root;};
        this.start=function(){
            Lampa.Controller.add(COMPONENT,{
                toggle:function(){try{Lampa.Controller.collectionSet(root,root);}catch(e){}},
                up:function(){press('up');},down:function(){press('down');},
                left:function(){press('left');},right:function(){press('right');},
                // Different Lampa/webOS builds call the centre key either `enter` or `ok`.
                // Register both so the physical LG remote and Y7 Remote work identically.
                enter:function(){press('ok');},
                ok:function(){press('ok');},
                back:function(){press('back');}
            });
            Lampa.Controller.toggle(COMPONENT);
            setTimeout(function(){say('Y7 Ігри. Обери гру.');},250);
        };
        this.pause=function(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}};
        this.stop=function(){};
        this.destroy=function(){
            dead=true;if(raf)cancelAnimationFrame(raf);
            try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}
            try{Lampa.Controller.remove(COMPONENT);}catch(e2){}
            try{root.remove();}catch(e3){}
        };
        this.back=function(){
            try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}
            if(screen!=='hub'){screen='hub';game=null;updateCaption();return;}
            try{Lampa.Activity.backward();}catch(e2){}
        };
    }

    function openArcade(){
        try{Lampa.Activity.push({url:'',title:'Y7 Ігри',component:COMPONENT,page:1});}catch(e){}
    }

    function register(){
        try{Lampa.Component.add(COMPONENT,Arcade);}catch(e){}

        try{
            if(Lampa.Menu&&Lampa.Menu.addButton&&!document.querySelector('.y7-kids-arcade-menu')){
                var b=Lampa.Menu.addButton(ICON,'Y7 Ігри',openArcade);
                if(b&&b.addClass)b.addClass('y7-kids-arcade-menu');
                else if(b&&b.classList)b.classList.add('y7-kids-arcade-menu');
            }
        }catch(e){}

        try{
            if(Lampa.Head&&Lampa.Head.addIcon&&!document.querySelector('.y7-kids-arcade-head')){
                var h=Lampa.Head.addIcon(ICON,openArcade);
                if(h&&h.addClass)h.addClass('y7-kids-arcade-head');
                else if(h&&h.classList)h.classList.add('y7-kids-arcade-head');
            }
        }catch(e){}

        try{
            if(Lampa.SettingsApi&&Lampa.SettingsApi.addComponent){
                Lampa.SettingsApi.addComponent({component:SETTINGS_COMPONENT,name:'Y7 Ігри',icon:ICON});
                Lampa.SettingsApi.addParam({
                    component:SETTINGS_COMPONENT,
                    param:{name:'y7_games_open',type:'trigger'},
                    field:{name:'Запустити Y7 Ігри',description:'7 міні-ігор: реакція, читання, математика, пам’ять, рахування, форми та лабіринт.'},
                    onChange:function(){try{Lampa.Storage.set('y7_games_open',false);}catch(e){}openArcade();}
                });
                Lampa.SettingsApi.addParam({
                    component:SETTINGS_COMPONENT,
                    param:{name:'y7_games_voice',type:'trigger',default:true},
                    field:{name:'Озвучення',description:'Український системний голос TV/браузера, якщо він доступний.'},
                    onChange:function(v){var s=readState();s.voice=!!v;saveState(s);}
                });
                Lampa.SettingsApi.addParam({
                    component:SETTINGS_COMPONENT,
                    param:{name:'y7_games_reset',type:'trigger'},
                    field:{name:'Скинути прогрес',description:'Очистити рекорди, зірки та вибраного героя.'},
                    onChange:function(){saveState(defaults());try{Lampa.Storage.set('y7_games_reset',false);}catch(e){}try{Lampa.Noty.show('Y7 Ігри: прогрес скинуто');}catch(e2){}}
                });
            }
        }catch(e){}
    }

    function init(){
        if(typeof Lampa==='undefined'||!Lampa.Component||!Lampa.Activity){setTimeout(init,220);return;}
        register();
    }
    init();
})();
