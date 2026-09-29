/*
 * Y7 Kids Arcade for Lampa / Y7 Media
 * Version: 3.0.0
 *
 * 14 mini-games, multi-level progression and randomized tasks:
 *  - Зоряний забіг, Склади слово, Приклади, Порахуй друзів
 *  - Пам'ять, Кольори та форми, Робо-лабіринт, Абетка
 *  - Збери слово, Більше чи менше, Послідовність, Знайди зайве
 *  - Напрямки, Сюрприз-мікс
 *
 * Voice: browser SpeechSynthesis (uk-UA preferred), with WebAudio fallback.
 * Art: local animated Canvas vector drawings; no external images.
 * Input: TV remote + LG/webOS aero cursor/pointer.
 */
(function(){
    'use strict';

    var VERSION='3.0.0';
    var COMPONENT='y7_kids_arcade';
    var SETTINGS_COMPONENT='y7_kids_arcade_settings';
    var READY='__Y7_KIDS_ARCADE_300__';
    var STORAGE='y7_kids_arcade_v3';
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
        {id:'mo',name:'M-O',ua:'М-О прибиральник',kind:'mo',c:'#eef7ff',a:'#46a3ff'},
        {id:'sprunki_g',name:'Sprunki Green',ua:'Спрункі зелений',kind:'sprunki',c:'#85d249',a:'#2f7440'},
        {id:'sprunki_o',name:'Sprunki Orange',ua:'Спрункі помаранчевий',kind:'sprunki',c:'#f5a33a',a:'#8f4e18'},
        {id:'sprunki_p',name:'Sprunki Pink',ua:'Спрункі рожевий',kind:'sprunki',c:'#f27dc3',a:'#8f3e7d'},
        {id:'sprunki_b',name:'Sprunki Blue',ua:'Спрункі синій',kind:'sprunki',c:'#53b9ee',a:'#215e87'},
        {id:'scream',name:'Scream',ua:'Крік',kind:'scream',c:'#f8f8f8',a:'#20242f'},
        {id:'spider',name:'Spider Hero',ua:'Людина-павук',kind:'spider',c:'#e64444',a:'#286bd6'},
        {id:'archie',name:'Archie',ua:'Кіт Арчі',kind:'archie',c:'#f1dfc3',a:'#b99065'},
        {id:'creeper',name:'Creeper',ua:'Кріпер',kind:'creeper',c:'#63c85a',a:'#236b2d'},
        {id:'steve',name:'Steve',ua:'Стів',kind:'steve',c:'#58b7c9',a:'#6c4835'},
        {id:'axolotl',name:'Axolotl',ua:'Аксолотль',kind:'axolotl',c:'#f28fb5',a:'#a85a94'},
        {id:'dog',name:'Buddy',ua:'Песик Бадді',kind:'dog',c:'#d7a46b',a:'#6e4d32'},
        {id:'mario',name:'Mario',ua:'Маріо',kind:'mario',c:'#e33e32',a:'#2d67c4'},
        {id:'yoshi',name:'Yoshi',ua:'Йоші',kind:'yoshi',c:'#59c95b',a:'#f6f6f6'},
        {id:'alice',name:'Alice',ua:'Дівчинка Аліса',kind:'alice',c:'#ffd06f',a:'#7f66d9'}
    ];

    var GAMES=[
        {id:'dash',title:'Зоряний забіг',sub:'Рух, реакція, бонуси',accent:'#62a8ff'},
        {id:'syllables',title:'Склади слово',sub:'Читання по складах',accent:'#79d477'},
        {id:'math',title:'Приклади',sub:'Додавання, віднімання, множення',accent:'#ffd45d'},
        {id:'count',title:'Порахуй друзів',sub:'Рахування та увага',accent:'#ff9c63'},
        {id:'memory',title:'Пам’ять',sub:'Знайди однакові пари',accent:'#c289ff'},
        {id:'shapes',title:'Кольори та форми',sub:'Колір, форма, уважність',accent:'#ff86bd'},
        {id:'maze',title:'Робо-лабіринт',sub:'Логіка й напрямки',accent:'#6fd8db'},
        {id:'alphabet',title:'Абетка',sub:'Знайди правильну літеру',accent:'#6fe3a6'},
        {id:'wordbuild',title:'Збери слово',sub:'Літери та прості слова',accent:'#6fc7ff'},
        {id:'compare',title:'Більше чи менше',sub:'>, < та =',accent:'#ffbd69'},
        {id:'sequence',title:'Послідовність',sub:'Що буде далі?',accent:'#8ba7ff'},
        {id:'oddone',title:'Знайди зайве',sub:'Логіка й уважність',accent:'#e997ff'},
        {id:'directions',title:'Напрямки',sub:'Ліво, право, вгору, вниз',accent:'#80dfd4'},
        {id:'mix',title:'Сюрприз-мікс',sub:'Випадкова навчальна гра',accent:'#ff7fa6'}
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
    var LETTER_WORDS=[
        {w:'КІТ',l:'К'},{w:'ДІМ',l:'Д'},{w:'ЛІС',l:'Л'},{w:'СОНЦЕ',l:'С'},
        {w:'МОРЕ',l:'М'},{w:'РИБА',l:'Р'},{w:'ХМАРА',l:'Х'},{w:'ЗІРКА',l:'З'},
        {w:'ЯБЛУКО',l:'Я'},{w:'БАНАН',l:'Б'},{w:'РОБОТ',l:'Р'},{w:'СОБАКА',l:'С'},
        {w:'КОТИК',l:'К'},{w:'РАКЕТА',l:'Р'},{w:'МАШИНА',l:'М'},{w:'КНИГА',l:'К'}
    ];
    var UA_LETTERS=['А','Б','В','Г','Д','Е','Є','Ж','З','И','І','Ї','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ю','Я'];
    var DIRECTIONS=[
        {id:'up',n:'вгору',glyph:'↑'},{id:'right',n:'праворуч',glyph:'→'},
        {id:'down',n:'вниз',glyph:'↓'},{id:'left',n:'ліворуч',glyph:'←'}
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
            levels:{},
            xp:0,
            pointer:true,
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
        d.best=d.best||{};d.levels=d.levels||{};if(typeof d.pointer==='undefined')d.pointer=true;
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
        var hitZones=[];
        var danceUntil=0;
        var pointerInside=false;

        function style(){
            if($('#y7-kids-arcade-style').length)return;
            $('<style id="y7-kids-arcade-style">'+
              '.y7a-root{position:relative;width:100%;height:100%;overflow:hidden;background:#08101d;box-sizing:border-box}'+
              '.y7a-canvas{display:block;width:100%;height:100%;object-fit:contain;background:#08101d;cursor:pointer;touch-action:none}'+
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
            ctx.save();
            var now=performance.now(),bob=Math.sin(now/430+(HEROES.indexOf(h)+1)*.55)*s*.015;
            ctx.translate(x,y+bob);
            if(now<danceUntil){ctx.rotate(Math.sin(now/85)*.12);var ds=1+Math.sin(now/72)*.045;ctx.scale(ds,ds);}
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
            }else if(k==='mo'){
                rr(-s*.28,-s*.30,s*.56,s*.48,s*.14,c);rr(-s*.21,-s*.20,s*.42,s*.17,s*.07,'#17253c');
                ctx.fillStyle=a;ctx.beginPath();ctx.arc(-s*.08,-s*.115,s*.028,0,7);ctx.arc(s*.08,-s*.115,s*.028,0,7);ctx.fill();
                rr(-s*.20,s*.18,s*.40,s*.10,s*.04,'#d9e5ef');ctx.strokeStyle=a;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-s*.12,s*.28);ctx.lineTo(-s*.24,s*.41);ctx.moveTo(s*.12,s*.28);ctx.lineTo(s*.24,s*.41);ctx.stroke();
            }else if(k==='scream'){
                ctx.fillStyle='#151923';ctx.beginPath();ctx.ellipse(0,0,s*.31,s*.44,0,0,7);ctx.fill();
                ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,-s*.03,s*.24,s*.35,0,0,7);ctx.fill();
                ctx.fillStyle=a;ctx.beginPath();ctx.ellipse(-s*.085,-s*.10,s*.045,s*.085,-.25,0,7);ctx.ellipse(s*.085,-s*.10,s*.045,s*.085,.25,0,7);ctx.fill();
                ctx.beginPath();ctx.ellipse(0,s*.12,s*.055,s*.10,0,0,7);ctx.fill();
            }else if(k==='spider'){
                ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-s*.08,s*.25,0,7);ctx.fill();rr(-s*.23,s*.12,s*.46,s*.28,s*.12,a);
                ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(-s*.15,-s*.14);ctx.quadraticCurveTo(-s*.07,-s*.22,-s*.03,-s*.08);ctx.lineTo(-s*.13,-s*.02);ctx.closePath();ctx.fill();
                ctx.beginPath();ctx.moveTo(s*.15,-s*.14);ctx.quadraticCurveTo(s*.07,-s*.22,s*.03,-s*.08);ctx.lineTo(s*.13,-s*.02);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#25345f';ctx.lineWidth=2;for(var wi=0;wi<4;wi++){ctx.beginPath();ctx.moveTo(0,-s*.08);ctx.lineTo(Math.cos(wi*Math.PI/4)*s*.24,-s*.08+Math.sin(wi*Math.PI/4)*s*.24);ctx.stroke();}
            }else if(k==='archie'){
                ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,s*.30,0,7);ctx.fill();
                ctx.beginPath();ctx.moveTo(-s*.22,-s*.19);ctx.lineTo(-s*.30,-s*.43);ctx.lineTo(-s*.06,-s*.28);ctx.fill();
                ctx.beginPath();ctx.moveTo(s*.22,-s*.19);ctx.lineTo(s*.30,-s*.43);ctx.lineTo(s*.06,-s*.28);ctx.fill();
                ctx.fillStyle=a;ctx.globalAlpha=.32;ctx.beginPath();ctx.ellipse(0,-s*.12,s*.16,s*.11,0,0,7);ctx.fill();ctx.globalAlpha=1;
                ctx.fillStyle='#6a5945';ctx.beginPath();ctx.ellipse(-s*.10,-s*.03,s*.045,s*.055,0,0,7);ctx.ellipse(s*.10,-s*.03,s*.045,s*.055,0,0,7);ctx.fill();
                ctx.fillStyle='#d58b83';ctx.beginPath();ctx.moveTo(0,s*.035);ctx.lineTo(-s*.035,s*.08);ctx.lineTo(s*.035,s*.08);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#fff7ec';ctx.lineWidth=2;for(var aw=-1;aw<=1;aw+=2){for(var ai=0;ai<3;ai++){ctx.beginPath();ctx.moveTo(aw*s*.10,s*(.08+ai*.025));ctx.lineTo(aw*s*.35,s*(.03+ai*.04));ctx.stroke();}}
            }else if(k==='creeper'){
                rr(-s*.24,-s*.32,s*.48,s*.48,s*.02,c);rr(-s*.20,s*.16,s*.15,s*.26,s*.02,c);rr(s*.05,s*.16,s*.15,s*.26,s*.02,c);
                ctx.fillStyle=a;ctx.fillRect(-s*.15,-s*.18,s*.08,s*.08);ctx.fillRect(s*.07,-s*.18,s*.08,s*.08);ctx.fillRect(-s*.06,-s*.07,s*.12,s*.07);ctx.fillRect(-s*.12,0,s*.08,s*.12);ctx.fillRect(s*.04,0,s*.08,s*.12);
            }else if(k==='steve'){
                rr(-s*.23,-s*.34,s*.46,s*.38,s*.03,'#c58b67');ctx.fillStyle='#3b2a25';ctx.fillRect(-s*.23,-s*.34,s*.46,s*.09);
                ctx.fillStyle='#fff';ctx.fillRect(-s*.12,-s*.15,s*.07,s*.05);ctx.fillRect(s*.05,-s*.15,s*.07,s*.05);ctx.fillStyle='#4f7dc8';ctx.fillRect(-s*.10,-s*.14,s*.03,s*.04);ctx.fillRect(s*.07,-s*.14,s*.03,s*.04);
                rr(-s*.27,s*.03,s*.54,s*.25,s*.02,c);rr(-s*.20,s*.28,s*.16,s*.18,s*.02,'#314a77');rr(s*.04,s*.28,s*.16,s*.18,s*.02,'#314a77');
            }else if(k==='axolotl'){
                ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,s*.30,s*.24,0,0,7);ctx.fill();
                for(var ax=-1;ax<=1;ax+=2){ctx.strokeStyle=a;ctx.lineWidth=s*.055;for(var aj=-1;aj<=1;aj++){ctx.beginPath();ctx.moveTo(ax*s*.25,aj*s*.09);ctx.lineTo(ax*s*.43,aj*s*.15);ctx.stroke();}}
                ctx.fillStyle='#40293b';ctx.beginPath();ctx.arc(-s*.09,-s*.04,s*.03,0,7);ctx.arc(s*.09,-s*.04,s*.03,0,7);ctx.fill();ctx.strokeStyle='#8f4b7e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,s*.035,s*.09,.2,Math.PI-.2);ctx.stroke();
            }else if(k==='dog'){
                ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,s*.29,0,7);ctx.fill();
                ctx.fillStyle=a;ctx.beginPath();ctx.ellipse(-s*.25,-s*.02,s*.11,s*.22,-.45,0,7);ctx.ellipse(s*.25,-s*.02,s*.11,s*.22,.45,0,7);ctx.fill();
                ctx.fillStyle='#33251f';ctx.beginPath();ctx.arc(-s*.09,-s*.05,s*.035,0,7);ctx.arc(s*.09,-s*.05,s*.035,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,s*.06,s*.05,0,7);ctx.fill();ctx.strokeStyle='#6e4d32';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,s*.09,s*.10,.2,Math.PI-.2);ctx.stroke();
            }else if(k==='mario'){
                ctx.fillStyle='#f1b082';ctx.beginPath();ctx.arc(0,-s*.05,s*.23,0,7);ctx.fill();
                ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-s*.18,s*.25,Math.PI,Math.PI*2);ctx.fill();rr(-s*.24,-s*.20,s*.48,s*.08,s*.03,c);
                ctx.fillStyle='#4b2a1f';ctx.beginPath();ctx.ellipse(0,s*.02,s*.11,s*.045,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.08,-s*.06,s*.035,0,7);ctx.arc(s*.08,-s*.06,s*.035,0,7);ctx.fill();
                rr(-s*.25,s*.18,s*.50,s*.25,s*.08,a);ctx.fillStyle='#ffd55c';ctx.beginPath();ctx.arc(-s*.10,s*.24,s*.025,0,7);ctx.arc(s*.10,s*.24,s*.025,0,7);ctx.fill();
            }else if(k==='yoshi'){
                ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,-s*.02,s*.27,s*.30,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(s*.14,-s*.08,s*.16,s*.12,0,0,7);ctx.fill();
                ctx.fillStyle='#243a28';ctx.beginPath();ctx.arc(-s*.08,-s*.10,s*.03,0,7);ctx.arc(s*.05,-s*.10,s*.03,0,7);ctx.fill();ctx.fillStyle='#f08b52';ctx.beginPath();ctx.moveTo(-s*.18,-s*.26);ctx.lineTo(-s*.04,-s*.42);ctx.lineTo(s*.02,-s*.25);ctx.fill();
                rr(-s*.18,s*.25,s*.36,s*.12,s*.05,'#f28a55');
            }else if(k==='alice'){
                ctx.fillStyle='#f3c7a8';ctx.beginPath();ctx.arc(0,-s*.16,s*.19,0,7);ctx.fill();ctx.fillStyle='#6a4a35';ctx.beginPath();ctx.arc(0,-s*.22,s*.20,Math.PI,Math.PI*2);ctx.fill();
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.065,-s*.15,s*.025,0,7);ctx.arc(s*.065,-s*.15,s*.025,0,7);ctx.fill();ctx.fillStyle='#4d6f9a';ctx.beginPath();ctx.arc(-s*.065,-s*.15,s*.012,0,7);ctx.arc(s*.065,-s*.15,s*.012,0,7);ctx.fill();
                ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,s*.02);ctx.lineTo(-s*.28,s*.38);ctx.lineTo(s*.28,s*.38);ctx.closePath();ctx.fill();rr(-s*.08,-s*.04,s*.16,s*.08,s*.03,a);
            }else{
                rr(-s*.29,-s*.33,s*.58,s*.60,s*.16,c);rr(-s*.19,-s*.17,s*.38,s*.15,s*.07,a);
                ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.07,-s*.10,s*.03,0,7);ctx.arc(s*.07,-s*.10,s*.03,0,7);ctx.fill();
                rr(-s*.23,s*.26,s*.16,s*.16,s*.04,'#151827');rr(s*.07,s*.26,s*.16,s*.16,s*.04,'#151827');
            }
            ctx.restore();
        }

        function addHit(x,y,w,h,type,index){hitZones.push({x:x,y:y,w:w,h:h,type:type,index:index});}
        function hitAt(x,y){for(var i=hitZones.length-1;i>=0;i--){var z=hitZones[i];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)return z;}return null;}
        function canvasPoint(ev){
            var r=canvas.getBoundingClientRect(),sx=canvas.width/r.width,sy=canvas.height/r.height;
            return {x:(ev.clientX-r.left)*sx,y:(ev.clientY-r.top)*sy};
        }
        function levelOf(kind){var v=(state.levels&&state.levels[kind])||1;return Math.max(1,Math.min(30,v));}
        function setLevel(kind,v){state.levels=state.levels||{};state.levels[kind]=Math.max(1,Math.min(30,v));saveState(state);}
        function celebrate(ms){danceUntil=Math.max(danceUntil,performance.now()+(ms||900));}

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
            else if(id==='alphabet'){text('А',0,0,s*1.15,c,'center',900);}
            else if(id==='wordbuild'){text('К_Т',0,0,s*.70,c,'center',900);}
            else if(id==='compare'){text('> <',0,0,s*.68,c,'center',900);}
            else if(id==='sequence'){text('1 2 3',0,0,s*.48,c,'center',900);}
            else if(id==='oddone'){for(var o=0;o<4;o++){ctx.beginPath();ctx.arc((o-1.5)*s*.48,0,s*.14,0,7);ctx.fill();}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*.72,0,s*.08,0,7);ctx.fill();}
            else if(id==='directions'){text('↑→',0,0,s*.62,c,'center',900);}
            else if(id==='mix'){text('★?',0,0,s*.68,c,'center',900);}
            ctx.restore();
        }

        function drawHub(){
            bg();drawTop('Y7 ІГРИ','Навчальні міні-ігри · рівні · випадкові завдання · без реклами');
            var cards=hubCards(),cols=4,w=275,h=112,gx=18,gy=16,sx=56,sy=112;
            for(var i=0;i<cards.length;i++){
                var c=cards[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+gx),y=sy+row*(h+gy),sel=i===hubIndex;
                rr(x,y,w,h,17,sel?'rgba(65,112,245,.94)':'rgba(255,255,255,.055)',sel?'#b9c7ff':'rgba(255,255,255,.07)',2);
                var title=c.type==='game'?c.game.title:c.title,sub=c.type==='game'?c.game.sub:c.sub,ac=c.type==='game'?c.game.accent:c.accent;
                if(c.type==='game')drawGameIcon(c.game.id,x+42,y+56,25,ac);
                else if(c.type==='hero')drawHero(hero(),x+43,y+55,58);
                else{ctx.strokeStyle=ac;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+43,y+55,23,0,7);ctx.stroke();text('⚙',x+43,y+56,21,ac,'center',700);}
                text(title,x+82,y+35,17,'#fff','left',850);text(sub,x+82,y+59,11,'#bdc6da','left',600);
                if(c.type==='game'){text('Рівень '+levelOf(c.game.id)+' · рекорд '+(state.best[c.game.id]||0),x+82,y+86,10,'#82dfa2','left',700);}
                addHit(x,y,w,h,'hub',i);
            }
            text('Пульт: стрілки + OK · Аеро-пульт: наведи й натисни · Назад — вихід',640,688,15,'#9eabc6','center',600);
        }

        function drawHeroes(){
            bg();drawTop('ОБЕРИ ГЕРОЯ','24 герої · кожен рухається й святкує перемоги');
            var cols=6,w=176,h=122,gx=18,gy=12,sx=57,sy=108;
            for(var i=0;i<HEROES.length;i++){
                var hro=HEROES[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+gx),y=sy+row*(h+gy),sel=i===heroIndex;
                rr(x,y,w,h,16,sel?'rgba(68,105,245,.94)':'rgba(255,255,255,.055)',sel?'#a9bdff':'rgba(255,255,255,.07)',2);
                drawHero(hro,x+88,y+48,67);text(hro.ua,x+88,y+96,12,'#fff','center',800);
                addHit(x,y,w,h,'hero',i);
            }
            text('OK / клік — обрати · Назад — до ігор',640,688,16,'#9eabc6','center',600);
        }

        function drawSettings(){
            bg();drawTop('НАЛАШТУВАННЯ ІГОР','Зберігаються тільки на цьому TV');
            var rows=[
                {n:'Вік / складність',v:state.age},
                {n:'Озвучення',v:state.voice?'Увімкнено':'Вимкнено'},
                {n:'Звуки',v:state.music?'Увімкнено':'Вимкнено'},
                {n:'Швидкість голосу',v:(Math.round((state.voiceRate||.88)*100))+'%'},
                {n:'Аеро-пульт / курсор',v:state.pointer?'Увімкнено':'Вимкнено'},
                {n:'Скинути прогрес',v:'OK двічі'}
            ];
            var idx=game&&game.settingsIndex||0;
            for(var i=0;i<rows.length;i++){
                var y=132+i*76,sel=i===idx;rr(270,y,740,58,15,sel?'rgba(68,105,245,.92)':'rgba(255,255,255,.055)',sel?'#a9bdff':'rgba(255,255,255,.07)',2);
                text(rows[i].n,305,y+29,18,'#fff','left',750);text(rows[i].v,972,y+29,16,sel?'#fff':'#aeb9cf','right',750);addHit(270,y,740,58,'settings',i);
            }
            text('←/→ — змінити · OK / клік — дія · Назад — до ігор',640,687,16,'#9eabc6','center',600);
        }

        // ---------- Common quiz helpers ----------
        function quizStart(kind){
            game={kind:kind,round:0,score:0,selected:0,feedback:'',locked:false,level:levelOf(kind),rounds:Math.min(12,8+Math.floor((levelOf(kind)-1)/2))};
            nextQuestion();
        }
        function ageMax(){
            if(state.age==='3-5')return 5;
            if(state.age==='5-7')return 10;
            return 20;
        }
        function choices(correct,min,max,count){
            var a=[correct],guard=0;
            while(a.length<(count||3)&&guard++<80){var x=ri(min,max);if(a.indexOf(x)<0)a.push(x);}
            return shuffle(a);
        }
        function markCorrect(points){
            game.score+=(points||1);state.stars+=(points||1);state.correct=(state.correct||0)+1;state.xp=(state.xp||0)+(points||1);saveState(state);good();celebrate(650);
        }
        function finishLevel(kind,score,maxScore){
            state.best[kind]=Math.max(state.best[kind]||0,score||0);state.played=(state.played||0)+1;
            if((score||0)>=Math.max(4,(maxScore||10)*.72)){setLevel(kind,levelOf(kind)+1);return true;}
            saveState(state);return false;
        }
        function endQuiz(){
            var up=finishLevel(game.kind,game.score,game.rounds*2);game.over=true;game.levelUp=up;celebrate(1800);
            say(up?'Супер! Відкрито новий рівень! Твій результат '+game.score+'.':'Молодець! Гра завершена. Твій результат '+game.score+'.');
        }
        function actualKind(){return game.kind==='mix'&&game.q?game.q.type:game.kind;}
        function buildQuestion(kind){
            var lv=game.level||1,max=ageMax()+Math.min(15,(lv-1)*2);
            if(kind==='math'){
                var useMul=state.age==='7+'&&lv>=4&&Math.random()<.28,plus=(!useMul)&&(state.age==='3-5'||Math.random()<.58),a,b,ans,op,spoken;
                if(useMul){a=ri(2,Math.min(9,3+Math.floor(lv/2)));b=ri(2,Math.min(9,3+Math.floor(lv/2)));ans=a*b;op='×';spoken=' помножити на ';}
                else{a=ri(1,max);b=ri(1,max);if(!plus&&b>a){var t=a;a=b;b=t;}ans=plus?a+b:a-b;op=plus?'+':'−';spoken=plus?' плюс ':' мінус ';}
                return {type:kind,a:a,b:b,op:op,ans:ans,opts:choices(ans,0,Math.max(max*2,ans+8),lv>=7?4:3),say:'Скільки буде '+a+spoken+b+'?'};
            }
            if(kind==='count'){
                var n=ri(1,Math.min(30,max+Math.floor(lv/2)));return {type:kind,n:n,opts:choices(n,1,Math.max(6,n+4),lv>=6?4:3),say:'Порахуй друзів. Скільки їх?'};
            }
            if(kind==='syllables'){
                var pool=WORDS.filter(function(w){return state.age==='3-5'?w.s.length===2:true;}),wd=pick(pool),miss=ri(0,wd.s.length-1),correct=wd.s[miss],wrong=[];
                var syll=['МА','МО','МУ','ТА','ТО','РА','РЕ','КА','КО','ЛА','ЛИ','НА','НО','БА','БО','ТИК','ГА','ШИ','СО','КЕ','ЗІР','РИ','ВА','ПА','КНИ'];
                while(wrong.length<(lv>=6?3:2)){var z=pick(syll);if(z!==correct&&wrong.indexOf(z)<0)wrong.push(z);}
                return {type:kind,word:wd,miss:miss,correct:correct,opts:shuffle([correct].concat(wrong)),say:'Склади слово '+wd.w.toLowerCase()+'. Який склад пропущено?'};
            }
            if(kind==='shapes'){
                var targetColor=pick(COLORS),targetShape=pick(SHAPES),cnt=lv>=5?9:6,items=[],correctIndex=ri(0,cnt-1);
                for(var i=0;i<cnt;i++){if(i===correctIndex)items.push({c:targetColor,s:targetShape});else{var cc=pick(COLORS),ss=pick(SHAPES);if(cc.n===targetColor.n&&ss.id===targetShape.id)cc=COLORS[(COLORS.indexOf(cc)+1)%COLORS.length];items.push({c:cc,s:ss});}}
                return {type:kind,targetColor:targetColor,targetShape:targetShape,items:items,correctIndex:correctIndex,say:'Знайди '+targetColor.n+' '+targetShape.n+'.'};
            }
            if(kind==='alphabet'){
                var lw=pick(LETTER_WORDS),opts=shuffle([lw.l].concat(shuffle(UA_LETTERS.filter(function(x){return x!==lw.l;})).slice(0,lv>=6?3:2)));
                return {type:kind,word:lw.w,correct:lw.l,opts:opts,say:'З якої літери починається слово '+lw.w.toLowerCase()+'?'};
            }
            if(kind==='wordbuild'){
                var ww=pick(LETTER_WORDS),pos=ri(0,ww.w.length-1),correct=ww.w[pos],opts2=shuffle([correct].concat(shuffle(UA_LETTERS.filter(function(x){return x!==correct;})).slice(0,lv>=6?3:2)));
                return {type:kind,word:ww.w,pos:pos,correct:correct,opts:opts2,say:'Яка літера пропущена у слові '+ww.w.toLowerCase()+'?'};
            }
            if(kind==='compare'){
                var aa=ri(0,max),bb=Math.random()<.18?aa:ri(0,max),ans3=aa===bb?'=':(aa>bb?'>':'<');return {type:kind,a:aa,b:bb,correct:ans3,opts:['<','=','>'],say:'Порівняй числа '+aa+' і '+bb+'.'};
            }
            if(kind==='sequence'){
                var step=ri(1,Math.min(5,1+Math.floor(lv/2))),start=ri(0,Math.max(4,max-step*4)),arr=[start,start+step,start+2*step,start+3*step],ans4=start+4*step;
                return {type:kind,seq:arr,ans:ans4,opts:choices(ans4,Math.max(0,ans4-6),ans4+7,lv>=6?4:3),say:'Продовж послідовність. Яке число буде далі?'};
            }
            if(kind==='oddone'){
                var base=pick(COLORS),odd=pick(COLORS.filter(function(c){return c.n!==base.n;})),cnt2=lv>=5?9:6,ci=ri(0,cnt2-1),its=[];for(var oi=0;oi<cnt2;oi++)its.push(oi===ci?odd:base);
                return {type:kind,items:its,correctIndex:ci,say:'Знайди зайвий колір.'};
            }
            if(kind==='directions'){
                var d=pick(DIRECTIONS),opts3=shuffle(DIRECTIONS.slice());return {type:kind,target:d,opts:opts3,correct:d.id,say:'Знайди стрілку '+d.n+'.'};
            }
            return buildQuestion('math');
        }
        function nextQuestion(){
            if(game.round>=game.rounds){endQuiz();return;}
            game.round++;game.selected=0;game.locked=false;game.feedback='';
            var k=game.kind==='mix'?pick(['math','count','syllables','shapes','alphabet','wordbuild','compare','sequence','oddone','directions']):game.kind;
            game.q=buildQuestion(k);say(game.q.say||'Обери правильну відповідь.');
        }
        function answerQuiz(){
            if(!game||game.locked||game.over)return;
            var k=actualKind(),q=game.q,ok=false;
            if(k==='math'||k==='count'||k==='sequence')ok=q.opts[game.selected]===(q.ans!==undefined?q.ans:q.n);
            else if(k==='syllables'||k==='alphabet'||k==='wordbuild'||k==='compare')ok=q.opts[game.selected]===q.correct;
            else if(k==='directions')ok=q.opts[game.selected].id===q.correct;
            else if(k==='shapes'||k==='oddone')ok=game.selected===q.correctIndex;
            game.locked=true;
            if(ok){markCorrect(2);game.feedback='Правильно!';say(pick(['Правильно! Молодець!','Супер! Правильна відповідь!','Чудово! Так тримати!','Клас! Ще один крок!']));}
            else{bad();game.feedback='Спробуй ще!';say(pick(['Майже. Спробуй ще раз.','Нічого страшного. Спробуй ще.','Подумай ще трішки.']));}
            setTimeout(function(){if(!game)return;if(ok)nextQuestion();else{game.locked=false;game.feedback='';}},820);
        }
        function quizTitle(k){
            return k==='math'?'ПРИКЛАДИ':k==='count'?'ПОРАХУЙ ДРУЗІВ':k==='syllables'?'СКЛАДИ СЛОВО':k==='shapes'?'КОЛЬОРИ ТА ФОРМИ':k==='alphabet'?'АБЕТКА':k==='wordbuild'?'ЗБЕРИ СЛОВО':k==='compare'?'БІЛЬШЕ ЧИ МЕНШЕ':k==='sequence'?'ПОСЛІДОВНІСТЬ':k==='oddone'?'ЗНАЙДИ ЗАЙВЕ':k==='directions'?'НАПРЯМКИ':'СЮРПРИЗ-МІКС';
        }
        function drawQuiz(){
            bg();var k=actualKind();drawTop(quizTitle(game.kind==='mix'?'mix':k),'Рівень '+game.level+' · раунд '+Math.min(game.round,game.rounds)+'/'+game.rounds+' · бал '+game.score);
            drawHero(hero(),165,360,145);
            if(game.over){
                text(game.levelUp?'НОВИЙ РІВЕНЬ!':'ГРУ ЗАВЕРШЕНО',720,245,42,game.levelUp?'#8ee4a6':'#fff','center',900);text('Результат: '+game.score,720,325,31,'#ffd65e','center',900);text('OK / клік — ще раз · Назад — до ігор',720,430,20,'#b9c6dd','center',700);addHit(510,390,420,90,'replay',0);return;
            }
            var q=game.q;
            if(k==='math'){text(q.a+' '+q.op+' '+q.b+' = ?',720,220,58,'#fff','center',900);drawChoiceRow(q.opts,720,390);}
            else if(k==='count'){
                var n=q.n,cols=Math.min(6,n),sx=475,sy=170;for(var i=0;i<n;i++){var col=i%cols,row=Math.floor(i/cols);drawHero(HEROES[(heroIndex+i+1)%HEROES.length],sx+col*92,sy+row*88,52);}drawChoiceRow(q.opts,720,535);
            }else if(k==='syllables'){
                var parts=q.word.s.slice();parts[q.miss]='?';text(parts.join(' - '),720,235,48,'#fff','center',900);text(q.word.w,720,300,20,'#8ea5cc','center',650);drawChoiceRow(q.opts,720,455);
            }else if(k==='alphabet'){
                text(q.word,720,225,58,'#fff','center',900);text('Починається з літери…',720,300,20,'#9db0cf','center',700);drawChoiceRow(q.opts,720,455);
            }else if(k==='wordbuild'){
                var shown=q.word.split('');shown[q.pos]='_';text(shown.join(' '),720,235,52,'#fff','center',900);text(q.word,720,302,19,'#8ea5cc','center',650);drawChoiceRow(q.opts,720,455);
            }else if(k==='compare'){
                text(q.a+'   ?   '+q.b,720,245,62,'#fff','center',900);drawChoiceRow(q.opts,720,430);
            }else if(k==='sequence'){
                text(q.seq.join('  ·  ')+'  ·  ?',720,235,42,'#fff','center',900);drawChoiceRow(q.opts,720,430);
            }else if(k==='directions'){
                text('Покажи: '+q.target.n,720,205,30,'#fff','center',800);var optsD=q.opts.map(function(d){return d.glyph;});drawChoiceRow(optsD,720,410);
            }else if(k==='shapes'){
                text('Знайди: '+q.targetColor.n+' '+q.targetShape.n,720,145,27,'#fff','center',800);drawTileGrid(q.items.length,function(i,x,y,w,h,sel){var item=q.items[i];rr(x,y,w,h,16,sel?'rgba(68,105,245,.9)':'rgba(255,255,255,.055)',sel?'#b3c2ff':'rgba(255,255,255,.07)',2);drawShape(item.s.id,x+w/2,y+h/2,Math.min(w,h)*.27,item.c.c);});
            }else if(k==='oddone'){
                text('Знайди колір, який відрізняється',720,145,27,'#fff','center',800);drawTileGrid(q.items.length,function(i,x,y,w,h,sel){rr(x,y,w,h,16,sel?'rgba(68,105,245,.9)':'rgba(255,255,255,.055)',sel?'#b3c2ff':'rgba(255,255,255,.07)',2);ctx.fillStyle=q.items[i].c;ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*.24,0,7);ctx.fill();});
            }
            if(game.feedback)text(game.feedback,720,625,24,game.feedback==='Правильно!'?'#80e7a0':'#ffd06b','center',850);
        }
        function drawChoiceRow(opts,cx,y){
            var w=150,g=20,total=opts.length*w+(opts.length-1)*g,x=cx-total/2;
            for(var i=0;i<opts.length;i++){var sel=i===game.selected;rr(x+i*(w+g),y,w,86,18,sel?'rgba(68,105,245,.92)':'rgba(255,255,255,.06)',sel?'#b3c2ff':'rgba(255,255,255,.08)',2);text(opts[i]&&opts[i].glyph?opts[i].glyph:opts[i],x+i*(w+g)+w/2,y+43,30,'#fff','center',900);addHit(x+i*(w+g),y,w,86,'quiz',i);}
        }
        function drawTileGrid(n,drawer){
            var cols=n<=6?3:3,rows=Math.ceil(n/cols),w=160,h=n<=6?135:105,gx=34,gy=18,sx=470,sy=200;
            for(var i=0;i<n;i++){var col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+gx),y=sy+row*(h+gy),sel=i===game.selected;drawer(i,x,y,w,h,sel);addHit(x,y,w,h,'quiz',i);}
        }
        function drawShape(id,x,y,s,c){
            ctx.save();ctx.fillStyle=c;ctx.strokeStyle='#fff';ctx.lineWidth=3;if(id==='circle'){ctx.beginPath();ctx.arc(x,y,s,0,7);ctx.fill();}else if(id==='square')rr(x-s,y-s,s*2,s*2,8,c);else{ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s,y+s);ctx.lineTo(x-s,y+s);ctx.closePath();ctx.fill();}ctx.restore();
        }

        // ---------- Memory ----------
        function memoryStart(){
            var lv=levelOf('memory'),pairCount=state.age==='3-5'?4:Math.min(8,5+Math.floor(lv/3));
            var pool=shuffle(HEROES).slice(0,pairCount),cards=[];
            for(var i=0;i<pool.length;i++){cards.push({h:pool[i],open:false,done:false});cards.push({h:pool[i],open:false,done:false});}
            game={kind:'memory',cards:shuffle(cards),selected:0,first:-1,matches:0,moves:0,locked:false,score:0,level:lv};
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
                    game.levelUp=finishLevel('memory',game.score,game.cards.length*1.5);game.over=true;celebrate(1800);say(game.levelUp?'Усі пари знайдено. Новий рівень!':'Усі пари знайдено. Молодець!');
                }
            }else{
                bad();game.locked=true;setTimeout(function(){a.open=false;b.open=false;game.locked=false;},700);
            }
        }
        function drawMemory(){
            bg();drawTop('ПАМ’ЯТЬ','Рівень '+game.level+' · пари '+game.matches+'/'+(game.cards.length/2)+' · ходи '+game.moves);
            var n=game.cards.length,cols=n<=8?4:n<=12?6:8,w=n<=8?150:n<=12?140:120,h=n<=8?180:n<=12?160:145,g=n<=8?24:16,total=cols*w+(cols-1)*g,sx=(1280-total)/2,sy=135;
            for(var i=0;i<n;i++){
                var c=game.cards[i],col=i%cols,row=Math.floor(i/cols),x=sx+col*(w+g),y=sy+row*(h+g),sel=i===game.selected;
                rr(x,y,w,h,16,sel?'rgba(68,105,245,.92)':c.done?'rgba(85,175,110,.28)':'rgba(255,255,255,.055)',sel?'#b3c2ff':'rgba(255,255,255,.08)',2);
                if(c.open||c.done){drawHero(c.h,x+w/2,y+h*.43,Math.min(88,h*.55));text(c.h.ua,x+w/2,y+h-26,Math.max(10,n<=8?13:11),'#fff','center',750);}else{text('Y7',x+w/2,y+h*.48,24,'#8da4cf','center',900);}
                addHit(x,y,w,h,'memory',i);
            }
            if(game.over){text(game.levelUp?'Новий рівень! OK / клік — ще раз':'Готово! OK / клік — ще раз · Назад — до ігор',640,665,20,'#8ee4a6','center',800);addHit(460,625,360,70,'replay',0);}
        }

        // ---------- Maze ----------
        function mazeStart(){
            var W=9,H=6,lv=levelOf('maze'),grid=[],x,y;for(y=0;y<H;y++){grid[y]=[];for(x=0;x<W;x++)grid[y][x]=0;}
            var density=Math.min(.34,.15+lv*.012);for(y=0;y<H;y++)for(x=0;x<W;x++)if((x||y)&&(x!==W-1||y!==H-1)&&Math.random()<density)grid[y][x]=1;
            // Clear a guaranteed random route from start to goal.
            x=0;y=0;grid[0][0]=0;while(x<W-1||y<H-1){if(x<W-1&&y<H-1){if(Math.random()<.55)x++;else y++;}else if(x<W-1)x++;else y++;grid[y][x]=0;}
            grid[H-1][W-1]=0;game={kind:'maze',grid:grid,w:W,h:H,px:0,py:0,gx:8,gy:5,steps:0,score:0,over:false,level:lv};say('Допоможи '+hero().ua+' дістатися до зірки.');
        }
        function mazeMove(dx,dy){
            if(game.over)return;var nx=game.px+dx,ny=game.py+dy;if(nx<0||ny<0||nx>=game.w||ny>=game.h)return;if(game.grid[ny][nx]){bad();say('Тут перешкода. Спробуй інший шлях.');return;}
            game.px=nx;game.py=ny;game.steps++;tone(470,.035,.015);if(nx===game.gx&&ny===game.gy){game.over=true;game.score=Math.max(1,36-game.steps);state.stars+=game.score;game.levelUp=finishLevel('maze',game.score,26);good();celebrate(1800);say(game.levelUp?'Ура! Новий рівень лабіринту!':'Ура! Зірку знайдено!');}
        }
        function drawMaze(){
            bg();drawTop('РОБО-ЛАБІРИНТ','Рівень '+game.level+' · кроки '+game.steps+' · знайди зірку');var cw=92,ch=82,sx=225,sy=120;
            for(var y=0;y<game.h;y++)for(var x=0;x<game.w;x++){var px=sx+x*cw,py=sy+y*ch;rr(px,py,cw-7,ch-7,10,game.grid[y][x]?'rgba(75,83,105,.72)':'rgba(255,255,255,.045)','rgba(255,255,255,.055)',1);if(x===game.gx&&y===game.gy)text('★',px+42,py+38,35,'#ffd85c','center',900);addHit(px,py,cw-7,ch-7,'maze',y*game.w+x);}
            drawHero(hero(),sx+game.px*cw+42,sy+game.py*ch+38,64);if(game.over){text(game.levelUp?'Новий рівень! +'+game.score+' ★':'Молодець! +'+game.score+' ★',640,655,20,'#8ee4a6','center',850);addHit(500,620,280,60,'replay',0);}
        }

        // ---------- Dash ----------
        function dashTheme(){
            var k=hero().kind;if(k==='sponge'||k==='patrick'||k==='gary')return 'sea';if(k==='walle'||k==='eve'||k==='mo'||k==='astro')return 'robot';if(k==='creeper'||k==='steve'||k==='axolotl')return 'blocks';if(k==='mario'||k==='yoshi')return 'mushroom';return 'space';
        }
        function dashStart(){
            var lv=levelOf('dash');game={kind:'dash',score:0,lives:state.age==='7+'?2:3,time:Math.max(32,48-lv),start:performance.now(),px:640,py:395,pickups:[],bad:[],over:false,inv:0,level:lv,theme:dashTheme()};
            for(var i=0;i<8;i++)dashSpawnPickup();for(var j=0;j<Math.min(8,(state.age==='3-5'?3:4)+Math.floor(lv/3));j++)dashSpawnBad();say('Збирай бонуси та уникай перешкод. Уперед!');startSound();
        }
        function dashSpawnPickup(){var types=['star','letter','number','heart'];game.pickups.push({x:ri(90,1190),y:ri(150,650),r:14,type:pick(types),v:ri(0,9)});}
        function dashSpawnBad(){
            var sp=(state.age==='3-5'?55:state.age==='5-7'?78:105)+Math.min(75,game.level*4),types=game.theme==='sea'?['jelly','bubble','urchin']:game.theme==='robot'?['gear','dust','bolt']:game.theme==='blocks'?['tnt','slime','block']:game.theme==='mushroom'?['shell','cloud','block']:['asteroid','comet','orb'];
            game.bad.push({x:ri(80,1200),y:ri(160,640),vx:(Math.random()<.5?-1:1)*ri(sp,sp+35),vy:ri(-45,45),r:ri(22,31),type:pick(types),phase:Math.random()*6});
        }
        function dashMove(dx,dy){if(game.over)return;game.px=clamp(game.px+dx*54,55,1225);game.py=clamp(game.py+dy*54,120,665);dashHit(performance.now());}
        function d2(ax,ay,bx,by){var x=ax-bx,y=ay-by;return x*x+y*y;}
        function dashHit(now){
            for(var i=game.pickups.length-1;i>=0;i--){var p=game.pickups[i];if(d2(game.px,game.py,p.x,p.y)<2500){game.pickups.splice(i,1);var gain=p.type==='heart'?3:2;game.score+=gain;state.stars+=gain;good();celebrate(320);dashSpawnPickup();}}
            if(now<game.inv)return;for(var j=0;j<game.bad.length;j++){var b=game.bad[j];if(d2(game.px,game.py,b.x,b.y)<2700){game.lives--;game.inv=now+1100;bad();say('Обережно!');if(game.lives<=0)dashEnd();break;}}
        }
        function dashEnd(){if(game.over)return;game.over=true;game.levelUp=finishLevel('dash',game.score,24);celebrate(1500);say(game.levelUp?'Раунд завершено. Відкрито новий рівень!':'Раунд завершено. Рахунок '+game.score+'.');}
        function dashUpdate(dt,now){if(game.over)return;game.time=Math.max(0,Math.max(32,48-game.level)-(now-game.start)/1000);if(game.time<=0){dashEnd();return;}for(var i=0;i<game.bad.length;i++){var b=game.bad[i];b.x+=b.vx*dt;b.y+=b.vy*dt+Math.sin(now/330+b.phase)*6*dt;if(b.x<35||b.x>1245)b.vx*=-1;if(b.y<130||b.y>680)b.vy*=-1;}dashHit(now);}
        function drawPickup(p){
            if(p.type==='star')text('★',p.x,p.y,32,'#ffd75f','center',900);else if(p.type==='letter'){rr(p.x-20,p.y-20,40,40,10,'#4f9be8');text(UA_LETTERS[p.v%UA_LETTERS.length],p.x,p.y,18,'#fff','center',900);}else if(p.type==='number'){ctx.fillStyle='#77d98d';ctx.beginPath();ctx.arc(p.x,p.y,20,0,7);ctx.fill();text(String((p.v%9)+1),p.x,p.y,17,'#163c22','center',900);}else{text('♥',p.x,p.y,28,'#ff7799','center',900);}
        }
        function drawHazard(b){
            ctx.save();ctx.translate(b.x,b.y);var r=b.r,t=b.type;if(t==='jelly'){ctx.fillStyle='#cc76dc';ctx.beginPath();ctx.arc(0,-r*.15,r*.7,Math.PI,Math.PI*2);ctx.lineTo(r*.7,r*.2);ctx.lineTo(-r*.7,r*.2);ctx.fill();ctx.strokeStyle='#efb7ff';ctx.lineWidth=3;for(var i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r*.26,r*.15);ctx.quadraticCurveTo(i*r*.20,r*.7,i*r*.32,r);ctx.stroke();}}
            else if(t==='bubble'||t==='orb'){ctx.strokeStyle=t==='bubble'?'#82d9ff':'#ce9cff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.72,0,7);ctx.stroke();ctx.globalAlpha=.25;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.22,-r*.22,r*.16,0,7);ctx.fill();}
            else if(t==='gear'){ctx.fillStyle='#8794a8';ctx.beginPath();for(var g=0;g<16;g++){var a=g*Math.PI/8,rad=g%2?r*.68:r;var x=Math.cos(a)*rad,y=Math.sin(a)*rad;if(!g)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.fillStyle='#263344';ctx.beginPath();ctx.arc(0,0,r*.25,0,7);ctx.fill();}
            else if(t==='dust'){ctx.fillStyle='#b58d6b';for(var d=0;d<5;d++){ctx.beginPath();ctx.arc(Math.cos(d*2)*r*.45,Math.sin(d*1.7)*r*.4,r*.28,0,7);ctx.fill();}}
            else if(t==='tnt'){rr(-r,-r*.75,r*2,r*1.5,4,'#d64b43');text('TNT',0,0,Math.max(12,r*.55),'#fff','center',900);}
            else if(t==='slime'){ctx.fillStyle='#55bd5a';ctx.beginPath();ctx.arc(0,0,r*.7,0,7);ctx.fill();ctx.fillStyle='#173b20';ctx.beginPath();ctx.arc(-r*.22,-r*.1,r*.09,0,7);ctx.arc(r*.22,-r*.1,r*.09,0,7);ctx.fill();}
            else if(t==='shell'){ctx.fillStyle='#58c768';ctx.beginPath();ctx.ellipse(0,0,r*.85,r*.62,0,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.45,0,7);ctx.stroke();}
            else if(t==='cloud'){ctx.fillStyle='#dfefff';for(var c=-1;c<=1;c++){ctx.beginPath();ctx.arc(c*r*.4,c?0:-r*.2,r*.5,0,7);ctx.fill();}}
            else if(t==='urchin'){ctx.strokeStyle='#8f63c6';ctx.lineWidth=4;for(var u=0;u<12;u++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(u*Math.PI/6)*r,Math.sin(u*Math.PI/6)*r);ctx.stroke();}ctx.fillStyle='#633e96';ctx.beginPath();ctx.arc(0,0,r*.45,0,7);ctx.fill();}
            else if(t==='block'){rr(-r*.75,-r*.75,r*1.5,r*1.5,3,'#8c6f4d');ctx.strokeStyle='#b99a71';ctx.lineWidth=2;ctx.strokeRect(-r*.6,-r*.6,r*1.2,r*1.2);}
            else if(t==='comet'){ctx.strokeStyle='#f0a85e';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-r*1.2,r*.5);ctx.lineTo(0,0);ctx.stroke();ctx.fillStyle='#d86c4f';ctx.beginPath();ctx.arc(0,0,r*.55,0,7);ctx.fill();}
            else if(t==='bolt'){text('⚡',0,0,r*1.2,'#ffd85e','center',900);}
            else{ctx.fillStyle='#76627d';ctx.beginPath();for(var a2=0;a2<8;a2++){var aa=a2*Math.PI/4,rrr=a2%2?r*.72:r;var xx=Math.cos(aa)*rrr,yy=Math.sin(aa)*rrr;if(!a2)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fill();}
            ctx.restore();
        }
        function drawDash(){
            bg();drawTop('ЗОРЯНИЙ ЗАБІГ','Рівень '+game.level+' · ★ '+game.score+' · ♥ '+game.lives+' · '+Math.ceil(game.time)+' с');rr(28,105,1224,580,24,'rgba(255,255,255,.025)','rgba(255,255,255,.05)',2);
            for(var i=0;i<game.pickups.length;i++)drawPickup(game.pickups[i]);for(var j=0;j<game.bad.length;j++)drawHazard(game.bad[j]);ctx.globalAlpha=performance.now()<game.inv&&Math.floor(performance.now()/100)%2===0?.35:1;drawHero(hero(),game.px,game.py,86);ctx.globalAlpha=1;addHit(28,105,1224,580,'dash',0);
            if(game.over){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,1280,720);text(game.levelUp?'НОВИЙ РІВЕНЬ!':'РАУНД ЗАВЕРШЕНО',640,300,44,game.levelUp?'#8ee4a6':'#fff','center',900);text('Рахунок '+game.score,640,365,30,'#ffd75f','center',900);text('OK / клік — ще раз · Назад — до ігор',640,455,19,'#c5cfe2','center',700);addHit(450,410,380,90,'replay',0);}
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
            if(screen==='hub')caption.text('Пульт: стрілки + OK · Аеро-пульт: наведи й натисни · Назад: вихід');
            else if(screen==='heroes')caption.text('Стрілки / курсор: герой · OK / клік: обрати · Назад: до ігор');
            else if(screen==='settings')caption.text('Пульт або аеро-курсор · Назад: до ігор');
            else caption.text('Пульт: стрілки + OK · Аеро-пульт: курсор + клік · Назад: до ігор');
        }

        function press(name){
            ensureAudio();
            if(screen==='hub'){
                var cards=hubCards(),cols=4;if(name==='left')hubIndex=(hubIndex+cards.length-1)%cards.length;if(name==='right')hubIndex=(hubIndex+1)%cards.length;if(name==='up')hubIndex=(hubIndex-cols+cards.length)%cards.length;if(name==='down')hubIndex=(hubIndex+cols)%cards.length;
                if(name==='ok'){var c=cards[hubIndex];if(c.type==='game')startGame(c.game.id);else if(c.type==='hero'){screen='heroes';say('Обери героя.');}else{screen='settings';game={settingsIndex:0,resetArmed:false};}}
                if(name==='back'){self.back();return;}
            }else if(screen==='heroes'){
                var colsH=6,n=HEROES.length;if(name==='left')heroIndex=(heroIndex+n-1)%n;if(name==='right')heroIndex=(heroIndex+1)%n;if(name==='up')heroIndex=(heroIndex-colsH+n)%n;if(name==='down')heroIndex=(heroIndex+colsH)%n;
                if(name==='ok'){state.hero=hero().id;saveState(state);good();celebrate(900);say('Обрано '+hero().ua+'.');screen='hub';}if(name==='back')screen='hub';
            }else if(screen==='settings'){
                var idx=game.settingsIndex;if(name==='up')game.settingsIndex=(idx+5)%6;if(name==='down')game.settingsIndex=(idx+1)%6;
                if(name==='left'||name==='right'||name==='ok'){idx=game.settingsIndex;if(idx===0){var ages=['3-5','5-7','7+'],ai=ages.indexOf(state.age);state.age=ages[(ai+(name==='left'?-1:1)+ages.length)%ages.length];saveState(state);say('Складність '+state.age);}else if(idx===1){state.voice=!state.voice;saveState(state);if(state.voice)say('Озвучення увімкнено.',true);}else if(idx===2){state.music=!state.music;saveState(state);if(state.music)good();}else if(idx===3){state.voiceRate=clamp((parseFloat(state.voiceRate)||.88)+(name==='left'?-.05:.05),.65,1.15);saveState(state);say('Швидкість голосу.',true);}else if(idx===4){state.pointer=!state.pointer;saveState(state);say(state.pointer?'Аеро-пульт увімкнено.':'Аеро-пульт вимкнено.',true);}else if(idx===5&&name==='ok'){if(game.resetArmed){state=defaults();saveState(state);heroIndex=0;game.resetArmed=false;good();say('Прогрес скинуто.',true);}else{game.resetArmed=true;say('Натисни ОК ще раз, щоб скинути прогрес.',true);}}}
                if(name==='back')screen='hub';
            }else if(screen==='game'){
                if(game.kind==='dash'){
                    if(game.over&&name==='ok')dashStart();else if(name==='left')dashMove(-1,0);else if(name==='right')dashMove(1,0);else if(name==='up')dashMove(0,-1);else if(name==='down')dashMove(0,1);if(name==='back')screen='hub';
                }else if(game.kind==='maze'){
                    if(game.over&&name==='ok')mazeStart();else if(name==='left')mazeMove(-1,0);else if(name==='right')mazeMove(1,0);else if(name==='up')mazeMove(0,-1);else if(name==='down')mazeMove(0,1);if(name==='back')screen='hub';
                }else if(game.kind==='memory'){
                    var cols=game.cards.length<=8?4:game.cards.length<=12?6:8,n=game.cards.length;if(game.over&&name==='ok')memoryStart();else{if(name==='left')game.selected=(game.selected+n-1)%n;if(name==='right')game.selected=(game.selected+1)%n;if(name==='up')game.selected=(game.selected-cols+n)%n;if(name==='down')game.selected=(game.selected+cols)%n;if(name==='ok')memoryOpen();}if(name==='back')screen='hub';
                }else{
                    if(game.over&&name==='ok')quizStart(game.kind);else if(!game.locked){var k=actualKind(),cnt=(k==='shapes'||k==='oddone')?game.q.items.length:game.q.opts.length,colsQ=(k==='shapes'||k==='oddone')?3:cnt;if(name==='left')game.selected=(game.selected+cnt-1)%cnt;if(name==='right')game.selected=(game.selected+1)%cnt;if((k==='shapes'||k==='oddone')&&name==='up')game.selected=(game.selected-colsQ+cnt)%cnt;if((k==='shapes'||k==='oddone')&&name==='down')game.selected=(game.selected+colsQ)%cnt;if(name==='ok')answerQuiz();}if(name==='back')screen='hub';
                }
            }
            updateCaption();
        }

        function pointerMove(ev){
            if(!state.pointer)return;pointerInside=true;var p=canvasPoint(ev),z=hitAt(p.x,p.y);if(screen==='game'&&game&&game.kind==='dash'&&!game.over&&p.x>=28&&p.x<=1252&&p.y>=105&&p.y<=685){game.px=clamp(p.x,55,1225);game.py=clamp(p.y,120,665);dashHit(performance.now());return;}if(!z)return;
            if(z.type==='hub')hubIndex=z.index;else if(z.type==='hero')heroIndex=z.index;else if(z.type==='settings'&&game)game.settingsIndex=z.index;else if((z.type==='quiz'||z.type==='memory')&&game)game.selected=z.index;
        }
        function pointerClick(ev){
            if(!state.pointer)return;ensureAudio();var p=canvasPoint(ev),z=hitAt(p.x,p.y);if(!z)return;
            if(z.type==='hub'){hubIndex=z.index;press('ok');}
            else if(z.type==='hero'){heroIndex=z.index;press('ok');}
            else if(z.type==='settings'){game.settingsIndex=z.index;press('ok');}
            else if(z.type==='quiz'){game.selected=z.index;press('ok');}
            else if(z.type==='memory'){game.selected=z.index;press('ok');}
            else if(z.type==='replay'){press('ok');}
            else if(z.type==='maze'){
                var x=z.index%game.w,y=Math.floor(z.index/game.w),dx=x-game.px,dy=y-game.py;if(Math.abs(dx)+Math.abs(dy)===1)mazeMove(dx,dy);
            }else if(z.type==='dash'){game.px=clamp(p.x,55,1225);game.py=clamp(p.y,120,665);dashHit(performance.now());}
        }

        function draw(){
            hitZones=[];
            if(screen==='hub')drawHub();
            else if(screen==='heroes')drawHeroes();
            else if(screen==='settings')drawSettings();
            else if(screen==='game'){
                if(game.kind==='dash')drawDash();
                else if(game.kind==='memory')drawMemory();
                else if(game.kind==='maze')drawMaze();
                else drawQuiz();
            }
            if(performance.now()<danceUntil){ctx.globalAlpha=.75;for(var ci=0;ci<14;ci++){var cx=(ci*97+Math.floor(performance.now()/18)*((ci%3)+1))%1280,cy=105+((ci*53+Math.floor(performance.now()/13))%520);text(ci%2?'★':'✦',cx,cy,14+(ci%4)*3,ci%2?'#ffd65e':'#8ee4ff','center',900);}ctx.globalAlpha=1;}
        }

        function tick(now){
            if(dead)return;
            var dt=Math.min(.05,(now-last)/1000||0);last=now;
            if(screen==='game'&&game&&game.kind==='dash')dashUpdate(dt,now);
            draw();raf=requestAnimationFrame(tick);
        }

        this.create=function(){style();updateCaption();canvas.addEventListener('mousemove',pointerMove);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('click',pointerClick);last=performance.now();raf=requestAnimationFrame(tick);};
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
            try{canvas.removeEventListener('mousemove',pointerMove);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('click',pointerClick);}catch(e3){}
            try{root.remove();}catch(e4){}
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
                    field:{name:'Запустити Y7 Ігри',description:'14 міні-ігор: читання, математика, логіка, пам’ять, лабіринт, реакція та випадковий мікс.'},
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
