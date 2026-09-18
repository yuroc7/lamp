/*
 * K2 Plugin Manager for Lampa
 * File: 1.js
 * Version: 2.3.0
 *
 * Secure Lampac pairing:
 *   QR -> K2 Gateway -> Admin PIN -> unique per-TV token
 *
 * Public Funnel URL is safe to embed; NO secret token is embedded here.
 */
(function () {
    'use strict';

    var VERSION = '2.3.0';
    var COMPONENT = 'k2_plugin_manager';
    var DEFAULT_FUNNEL = 'https://02-108-prohidna.tail6cc3cf.ts.net';

    var MANAGED_KEY = 'k2pm_managed_urls_v3';
    var RESTART_KEY = 'k2pm_restart_needed';
    var FUNNEL_KEY = 'k2pm_secure_funnel';
    var CLIENT_TOKEN_KEY = 'k2pm_secure_token';
    var DEVICE_ID_KEY = 'k2pm_secure_device_id';
    var DEVICE_NAME_KEY = 'k2pm_secure_device_name';
    var LAMPAC_ON_KEY = 'k2pm_lampac_online';
    var SISI_ON_KEY = 'k2pm_lampac_sisi';
    var REGISTERED_ONLINE_KEY = 'k2pm_registered_lampac_online';
    var REGISTERED_SISI_KEY = 'k2pm_registered_lampac_sisi';

    if (window.__K2_PLUGIN_MANAGER_230__) return;
    window.__K2_PLUGIN_MANAGER_230__ = true;

    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.dcma = false;
    window.lampa_settings.disable_features =
        window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;

    var ICON =
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 7h16M7 12h10M9 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';

    var PLUGINS = [
        {id:'online_mod',cat:'online',name:'Online MOD',desc:'Основне онлайн-джерело з власним вибором балансерів.',url:'https://nb557.github.io/plugins/online_mod.js',on:true},
        {id:'filmix',cat:'online',name:'Filmix',desc:'Окреме джерело Filmix.',url:'https://lampaplugins.github.io/store/fx.js',on:true},
        {id:'bwa',cat:'online',name:'BWA Online',desc:'Додаткове онлайн-джерело.',url:'http://bwa.ad/rc',on:true},
        {id:'showy',cat:'online',name:'Showy',desc:'Додатковий онлайн-кінотеатр. HTTP-джерело.',url:'http://showy.online/m.js',on:true},
        {id:'modss',cat:'online',name:"MODS's",desc:'Онлайн-перегляд і додаткові налаштування.',url:'http://lampa.stream/modss',on:true},
        {id:'stream1',cat:'online',name:'Online Stream',desc:'Резервне онлайн-джерело.',url:'http://arkmv.ru/vod',on:false},
        {id:'stream2',cat:'online',name:'Online Stream 2',desc:'Ще одне резервне онлайн-джерело.',url:'http://llpp.in/v/vod.js',on:false},

        {id:'etor',cat:'torrent',name:'Etor: Parser + TorrServer',desc:'На LG/Tizen відкриває штатні пункти Парсер і TorrServer.',url:'http://cub.red/plugin/etor',on:true},
        {id:'pubtorr',cat:'torrent',name:'PubTorr',desc:'Публічні торрент-парсери без власного Jackett.',url:'https://lampame.github.io/main/pubtorr.js',on:true},
        {id:'ts_settings',cat:'torrent',name:'TorrServer Settings',desc:'Керування налаштуваннями TorrServer з Lampa.',url:'https://lampaplugins.github.io/store/pavelpikta/torrserver-settings.js',on:true},
        {id:'torrent_styles',cat:'torrent',name:'Torrent Styles MOD V2',desc:'Зручніший список торрентів: розмір, сіди, піри, бітрейт.',url:'https://lampaplugins.github.io/store/torrent_styles_v2.js',on:true},
        {id:'ts_preload',cat:'torrent',name:'TS Preload',desc:'Показує буферизацію TorrServer.',url:'https://plugin.rootu.top/ts-preload.js',on:true},
        {id:'no_autostart',cat:'torrent',name:'No Autostart',desc:'Не запускає торрент автоматично.',url:'https://lampaplugins.github.io/store/no-autostart.js',on:true},

        {id:'bwa18',cat:'adult',name:'BWA 18+',desc:'18+ агрегатор із багатьма джерелами.',url:'http://bwa.ad/re',on:false},
        {id:'xsena18',cat:'adult',name:'Xsena 18+',desc:'18+ агрегатор із великою кількістю джерел.',url:'http://e.xsena.red',on:false},

        {id:'collections',cat:'collections',name:'Netflix / Apple TV / HBO Max',desc:'Категорії стримінгових сервісів.',url:'https://tvigl.github.io/plugins/collections.js',on:true},
        {id:'cinema_picks',cat:'collections',name:'Підбірки кінотеатрів',desc:'Підбірки від онлайн-кінотеатрів, мультфільми й мультсеріали.',url:'https://lampaplugins.github.io/store/p.js',on:true},
        {id:'more_categories',cat:'collections',name:'Додаткові категорії',desc:'Ще більше тематичних категорій.',url:'https://lampame.github.io/main/nc/nc.js',on:false},
        {id:'surs',cat:'collections',name:'SURS',desc:'Динамічні підбірки за жанрами, сервісами та популярністю.',url:'https://aviamovie.github.io/surs.js',on:false},

        {id:'sport',cat:'tv',name:'Sport (CUB)',desc:'Спортивний розділ CUB.',url:'https://cub.red/plugin/sport',on:false},
        {id:'iptv',cat:'tv',name:'IPTV M3U + EPG',desc:'Свій M3U-плейлист, групи каналів та EPG.',url:'https://cdn.jsdelivr.net/gh/smackftw/lampa_iptv@main/dist/lampa-iptv.js',on:false},
        {id:'skaz_tv',cat:'tv',name:'TV by Skaz',desc:'Телебачення / IPTV. HTTP-джерело.',url:'http://skaz.tv/tv.js',on:false},

        {id:'subs',cat:'utils',name:'Improved Subtitles',desc:'Покращені субтитри; корисно на LG webOS.',url:'https://adambenhassen.github.io/subs.js',on:true},
        {id:'yummy',cat:'utils',name:'YummyAnime',desc:'Аніме-каталог, списки, рейтинги та прогрес.',url:'https://yummyanime.github.io/yummy-lampa-plugin/stable/index.js',on:false},
        {id:'qr_keyboard',cat:'utils',name:'QR-клавіатура',desc:'Введення тексту в Lampa з телефона через QR.',url:'https://fv.plymo.ru/p/kb.js',on:false},
        {id:'trailers_itunes',cat:'utils',name:'Трейлери iTunes',desc:'Альтернативне джерело трейлерів.',url:'https://plugin.rootu.top/trailers.js',on:false},
        {id:'cub_rating',cat:'utils',name:'Рейтинг CUB',desc:'Додатковий рейтинг CUB.',url:'https://plugin.rootu.top/cub-rating.js',on:false},
        {id:'record',cat:'utils',name:'Радіо Record',desc:'Радіо Record прямо в Lampa.',url:'https://lampaplugins.github.io/store/record.js',on:false},
        {id:'somafm',cat:'utils',name:'SomaFM',desc:'Безкоштовні інтернет-радіостанції SomaFM.',url:'https://tsynik.github.io/lampa/soma.js',on:false}
    ];

    var CAT_TITLES = {
        online:'🎬 ОНЛАЙН-КІНОТЕАТРИ / БАЛАНСЕРИ',
        torrent:'🧲 ТОРРЕНТИ / TORRSERVER',
        adult:'🔞 18+',
        collections:'🍿 NETFLIX / APPLE TV / HBO / ПІДБІРКИ',
        tv:'📺 ТБ / СПОРТ',
        utils:'🛠 КОРИСНЕ'
    };

    function log() {
        try {
            var a = Array.prototype.slice.call(arguments);
            a.unshift('[K2PM ' + VERSION + ']');
            console.log.apply(console, a);
        } catch (e) {}
    }

    function notify(s) {
        try { if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(s); } catch (e) {}
    }

    function norm(u) {
        return String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
    }

    function bool(v) {
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    function key(p) { return 'k2pm_' + p.id; }

    function enabled(p) {
        var marker = '__missing__', v;
        try { v = Lampa.Storage.get(key(p), marker); } catch (e) { v = marker; }
        if (v === marker || v === null || typeof v === 'undefined') {
            try { Lampa.Storage.set(key(p), !!p.on); } catch (e2) {}
            return !!p.on;
        }
        return bool(v);
    }

    function setEnabled(p, v) {
        try { Lampa.Storage.set(key(p), !!v); } catch (e) {}
    }

    function purl(x) {
        if (!x) return '';
        return typeof x === 'string' ? x : (x.url || '');
    }

    function registry() {
        try { return Lampa.Plugins.get() || []; } catch (e) { return []; }
    }

    function has(url) {
        var n = norm(url), a = registry();
        for (var i = 0; i < a.length; i++) if (norm(purl(a[i])) === n) return true;
        return false;
    }

    function add(url, meta) {
        if (!url || has(url)) return false;
        try {
            Lampa.Plugins.add({
                url:url,
                status:1,
                name:meta && meta.name ? meta.name : 'K2 plugin',
                author:'K2 Plugin Manager'
            });
            return true;
        } catch (e) { log('add error', url, e); return false; }
    }

    function remove(url) {
        if (!url || !has(url) || !Lampa.Plugins.remove) return false;
        try { Lampa.Plugins.remove(url); return true; }
        catch (e) { log('remove error', url, e); return false; }
    }

    function save() {
        try { Lampa.Plugins.save(); } catch (e) { log('save error', e); }
    }

    function load(urls) {
        if (!urls || !urls.length || !Lampa.Utils || !Lampa.Utils.putScript) return;
        try {
            Lampa.Utils.putScript(
                urls,
                function(){},
                function(url){ log('load error', url); },
                function(){},
                true
            );
        } catch (e) { log('putScript error', e); }
    }

    function needRestart(v) {
        try { Lampa.Storage.set(RESTART_KEY, !!v); } catch (e) {}
    }

    function baseUrl() {
        var u = '';
        try { u = Lampa.Storage.get(FUNNEL_KEY, DEFAULT_FUNNEL) || DEFAULT_FUNNEL; } catch (e) { u = DEFAULT_FUNNEL; }
        u = String(u).trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        return u;
    }

    function clientToken() {
        try { return String(Lampa.Storage.get(CLIENT_TOKEN_KEY, '') || '').trim(); } catch (e) { return ''; }
    }

    function secureOnlineUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/online/js/' + encodeURIComponent(t) : '';
    }

    function secureSisiUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/sisi/js/' + encodeURIComponent(t) : '';
    }

    function registeredValue(k) {
        try { return String(Lampa.Storage.get(k, '') || ''); } catch (e) { return ''; }
    }

    function setRegistered(k, v) {
        try { Lampa.Storage.set(k, v || ''); } catch (e) {}
    }

    function syncSecureLampac(loadNow) {
        var token = clientToken();
        var onlineOn = bool(Lampa.Storage.get(LAMPAC_ON_KEY, true));
        var sisiOn = bool(Lampa.Storage.get(SISI_ON_KEY, false));
        var nextOnline = token && onlineOn ? secureOnlineUrl() : '';
        var nextSisi = token && sisiOn ? secureSisiUrl() : '';
        var prevOnline = registeredValue(REGISTERED_ONLINE_KEY);
        var prevSisi = registeredValue(REGISTERED_SISI_KEY);
        var added = [], changed = false;

        if (prevOnline && norm(prevOnline) !== norm(nextOnline)) {
            if (remove(prevOnline)) changed = true;
            setRegistered(REGISTERED_ONLINE_KEY, '');
            needRestart(true);
        }
        if (prevSisi && norm(prevSisi) !== norm(nextSisi)) {
            if (remove(prevSisi)) changed = true;
            setRegistered(REGISTERED_SISI_KEY, '');
            needRestart(true);
        }

        if (nextOnline && add(nextOnline, {name:'K2 Lampac Online'})) {
            added.push(nextOnline); changed = true;
        }
        if (nextSisi && add(nextSisi, {name:'K2 Lampac SISI'})) {
            added.push(nextSisi); changed = true;
        }

        if (nextOnline) setRegistered(REGISTERED_ONLINE_KEY, nextOnline);
        if (nextSisi) setRegistered(REGISTERED_SISI_KEY, nextSisi);

        if (changed) save();
        if (loadNow) load(added);
        return changed;
    }

    function managedList() {
        var a = PLUGINS.map(function(p){ return p.url; });
        var x = registeredValue(REGISTERED_ONLINE_KEY);
        var y = registeredValue(REGISTERED_SISI_KEY);
        if (x) a.push(x);
        if (y) a.push(y);
        return a;
    }

    function reconcile(loadNow) {
        var added=[], changed=false, wanted={}, old=[];
        PLUGINS.forEach(function(p){ wanted[norm(p.url)] = enabled(p); });

        try { old = Lampa.Storage.get(MANAGED_KEY, []) || []; } catch (e) {}

        old.forEach(function(url) {
            var isSecure = norm(url) === norm(registeredValue(REGISTERED_ONLINE_KEY)) ||
                           norm(url) === norm(registeredValue(REGISTERED_SISI_KEY));
            if (!isSecure && !wanted[norm(url)] && remove(url)) {
                changed = true;
                needRestart(true);
            }
        });

        PLUGINS.forEach(function(p) {
            if (enabled(p)) {
                if (add(p.url, p)) { changed=true; added.push(p.url); }
            } else if (remove(p.url)) {
                changed=true; needRestart(true);
            }
        });

        if (syncSecureLampac(false)) changed=true;
        try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e) {}
        if (changed) save();
        if (loadNow) load(added);
        return {changed:changed,added:added.length};
    }

    function toggle(p,on) {
        setEnabled(p,on);
        if (on) {
            if (add(p.url,p)) { save(); load([p.url]); notify('✓ '+p.name+' увімкнено'); }
            else notify('✓ '+p.name+' уже увімкнений');
        } else {
            if (remove(p.url)) save();
            needRestart(true);
            notify('○ '+p.name+' вимкнено. Перезапусти Lampa.');
        }
        try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e) {}
    }

    function ajax(method, url, data, ok, fail) {
        try {
            var x = new XMLHttpRequest();
            x.open(method, url, true);
            x.timeout = 10000;
            x.setRequestHeader('Content-Type','application/json');
            x.onload = function() {
                var j = null;
                try { j = JSON.parse(x.responseText || '{}'); } catch (e) {}
                if (x.status >= 200 && x.status < 300) ok && ok(j || {});
                else fail && fail(j || {error:'HTTP '+x.status});
            };
            x.onerror = function(){ fail && fail({error:'network'}); };
            x.ontimeout = function(){ fail && fail({error:'timeout'}); };
            x.send(data ? JSON.stringify(data) : null);
        } catch (e) { fail && fail({error:String(e)}); }
    }

    function loadQrLib(done) {
        if (window.QRCode) return done(true);
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        s.onload = function(){ done(!!window.QRCode); };
        s.onerror = function(){ done(false); };
        (document.head || document.body || document.documentElement).appendChild(s);
    }

    function pairingDeviceName() {
        var name = 'LG TV / Lampa';
        try {
            if (Lampa.Platform && Lampa.Platform.get) {
                var p = Lampa.Platform.get();
                if (p) name = 'Lampa ' + p;
            }
        } catch (e) {}
        return name;
    }

    function showPairModal(data) {
        var controller = '';
        try { controller = Lampa.Controller.enabled().name; } catch (e) {}
        var stopped = false;
        var expireAt = Date.now() + ((data.expires_in || 300) * 1000);

        var box = $(
            '<div style="padding:1em;text-align:center">' +
            '<div class="k2-pair-qr" style="width:220px;height:220px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div>' +
            '<div style="font-size:1.05em;opacity:.8">Код на TV</div>' +
            '<div style="font-size:2.4em;font-weight:700;letter-spacing:.18em;margin:.15em 0 .35em">' + data.code + '</div>' +
            '<div class="k2-pair-state" style="font-size:1.05em">Відскануй QR телефоном і введи Admin PIN.</div>' +
            '<div style="opacity:.6;font-size:.8em;margin-top:1em">Якщо QR не читається: ' + data.manual_url + '</div>' +
            '</div>'
        );

        function close() {
            stopped = true;
            try { Lampa.Modal.close(); } catch (e) {}
            try { if (controller) Lampa.Controller.toggle(controller); } catch (e2) {}
        }

        Lampa.Modal.open({
            title:'K2 Lampac — безпечне підключення',
            html:box,
            size:'medium',
            onBack:close
        });

        loadQrLib(function(ok) {
            if (!ok || stopped) {
                box.find('.k2-pair-qr').html('<div style="color:#111;padding-top:75px">QR недоступний<br>використай код нижче</div>');
                return;
            }
            try {
                var el = box.find('.k2-pair-qr')[0];
                el.innerHTML = '';
                new QRCode(el, {
                    text:data.approve_url,
                    width:220,
                    height:220,
                    correctLevel:QRCode.CorrectLevel.M
                });
            } catch (e) {
                box.find('.k2-pair-qr').html('<div style="color:#111;padding-top:75px">QR недоступний</div>');
            }
        });

        function poll() {
            if (stopped) return;
            if (Date.now() > expireAt) {
                box.find('.k2-pair-state').text('Код протерміновано. Закрий це вікно і створи новий.');
                return;
            }

            var url = baseUrl() + '/pair/status/' + encodeURIComponent(data.pair_id) +
                      '?poll=' + encodeURIComponent(data.poll_secret);

            ajax('GET', url, null, function(r) {
                if (r.status === 'approved' && r.client_token) {
                    try {
                        Lampa.Storage.set(CLIENT_TOKEN_KEY, r.client_token);
                        Lampa.Storage.set(DEVICE_ID_KEY, r.device_id || '');
                        Lampa.Storage.set(DEVICE_NAME_KEY, r.device_name || 'LG TV');
                        Lampa.Storage.set(FUNNEL_KEY, r.base_url || baseUrl());
                        Lampa.Storage.set(LAMPAC_ON_KEY, true);
                    } catch (e) {}

                    syncSecureLampac(true);
                    try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e2) {}

                    box.find('.k2-pair-state').html('✓ <b>Підключено.</b> Lampac Online додано автоматично.');
                    notify('✓ K2 Lampac підключено');
                    setTimeout(close, 1800);
                    return;
                }

                setTimeout(poll, 1500);
            }, function(r) {
                if (!stopped) setTimeout(poll, 2200);
            });
        }

        setTimeout(poll, 700);
    }

    function startPairing() {
        var base = baseUrl();
        notify('Створюю код спарювання…');
        ajax('POST', base + '/pair/start', {device_name:pairingDeviceName()}, function(r) {
            if (!r.ok || !r.pair_id) return notify('K2: шлюз не створив сесію');
            showPairModal(r);
        }, function(r) {
            notify('K2: Gateway недоступний або pairing заблокований');
        });
    }

    function checkSecureLampac() {
        var t = clientToken();
        if (!t) return notify('K2 Lampac ще не підключений. Використай QR pairing.');
        ajax('GET', baseUrl() + '/k2/me?token=' + encodeURIComponent(t), null, function(r) {
            if (r.ok) notify('✓ Secure Lampac: ' + (r.device_name || 'TV') + ' авторизований');
            else notify('✕ Token не прийнято');
        }, function(){ notify('✕ Secure Lampac недоступний'); });
    }

    function forgetSecureLampac() {
        var token = clientToken();

        function clearLocal() {
            var a = registeredValue(REGISTERED_ONLINE_KEY);
            var b = registeredValue(REGISTERED_SISI_KEY);
            if (a) remove(a);
            if (b) remove(b);
            save();
            setRegistered(REGISTERED_ONLINE_KEY,'');
            setRegistered(REGISTERED_SISI_KEY,'');
            try {
                Lampa.Storage.set(CLIENT_TOKEN_KEY,'');
                Lampa.Storage.set(DEVICE_ID_KEY,'');
                Lampa.Storage.set(DEVICE_NAME_KEY,'');
            } catch (e) {}
            needRestart(true);
            notify('K2 Lampac забуто на цьому TV. Перезапусти Lampa.');
        }

        if (!token) return clearLocal();

        ajax('POST', baseUrl() + '/k2/revoke', {token:token}, function() {
            clearLocal();
        }, function() {
            clearLocal();
            notify('Token видалено з TV, але Gateway був недоступний для відкликання.');
        });
    }

    function setTorrServer(v) {
        var u=String(v||'').trim();
        if (!u) u='http://127.0.0.1:8090';
        if (!/^https?:\/\//i.test(u)) u='http://'+u;
        u=u.replace(/\/+$/,'');
        try {
            Lampa.Storage.set('k2pm_ts_url',u);
            Lampa.Storage.set('torrserver_url',u);
        } catch(e){}
        notify('TorrServer: '+u);
    }

    function checkTorrServer() {
        var u='http://127.0.0.1:8090';
        try { u=Lampa.Storage.get('k2pm_ts_url',u)||u; } catch(e){}
        try {
            var x=new XMLHttpRequest();
            x.open('GET',u.replace(/\/+$/,'')+'/echo',true);
            x.timeout=6000;
            x.onload=function(){notify(x.status>=200&&x.status<500?'✓ TorrServer доступний':'✕ TorrServer HTTP '+x.status);};
            x.onerror=function(){notify('✕ TorrServer не відповідає');};
            x.ontimeout=x.onerror;
            x.send();
        } catch(e){notify('✕ Не вдалося перевірити TorrServer');}
    }

    function addParam(o) {
        try { Lampa.SettingsApi.addParam(o); } catch(e){ log('param error',e); }
    }

    function setupSettings() {
        try {
            Lampa.SettingsApi.addComponent({component:COMPONENT,name:'K2 Plugin Manager',icon:ICON});
        } catch(e){}

        addParam({
            component:COMPONENT,
            param:{name:FUNNEL_KEY,type:'input',values:'',default:DEFAULT_FUNNEL},
            field:{name:'Secure Lampac — Funnel URL',description:'Уже встановлено твій K2 Funnel. Змінюй тільки якщо адреса Tailscale зміниться.'}
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_pair_secure',type:'trigger',default:false},
            field:{name:'📱 Підключити Lampac через QR',description:'TV покаже QR і короткий код. На телефоні вводиш тільки K2 Admin PIN.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_pair_secure',false);}catch(e){}
                startPairing();
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:LAMPAC_ON_KEY,type:'trigger',default:true},
            field:{name:'Lampac Online',description:'Всі онлайн-провайдери твого віддаленого Lampac через захищений Funnel.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });

        addParam({
            component:COMPONENT,
            param:{name:SISI_ON_KEY,type:'trigger',default:false},
            field:{name:'Lampac SISI 18+',description:'SISI з віддаленого Lampac. Потрібне попереднє QR-підключення.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_secure',type:'trigger',default:false},
            field:{name:'Перевірити Secure Lampac',description:'Перевіряє Funnel і авторизацію цього телевізора.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_check_secure',false);}catch(e){}
                checkSecureLampac();
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_forget_secure',type:'trigger',default:false},
            field:{name:'Забути підключення Lampac',description:'Видаляє token тільки з цього TV. Для нового підключення використовуй QR.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_forget_secure',false);}catch(e){}
                forgetSecureLampac();
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_ts_url',type:'input',values:'',default:'http://127.0.0.1:8090'},
            field:{name:'TorrServer на цьому LG TV',description:'Для твого LG: http://127.0.0.1:8090'},
            onChange:setTorrServer
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_ts',type:'trigger',default:false},
            field:{name:'Перевірити TorrServer',description:'Перевірка локального TorrServer на LG.'},
            onChange:function(){try{Lampa.Storage.set('k2pm_check_ts',false);}catch(e){}checkTorrServer();}
        });

        PLUGINS.forEach(function(p){
            addParam({
                component:COMPONENT,
                param:{name:key(p),type:'trigger',default:!!p.on},
                field:{name:p.name,description:p.desc},
                onChange:function(v){toggle(p,bool(v));}
            });
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_sync',type:'trigger',default:false},
            field:{name:'Застосувати / синхронізувати',description:'Привести реєстр Lampa до стану перемикачів.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_sync',false);}catch(e){}
                var r=reconcile(true);
                notify('K2: синхронізовано, нових '+r.added);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_defaults',type:'trigger',default:false},
            field:{name:'Рекомендований набір K2',description:'Онлайн + TorrServer + підбірки + субтитри. 18+/TV/експериментальні вимкнені.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_defaults',false);}catch(e){}
                PLUGINS.forEach(function(p){setEnabled(p,!!p.on);});
                reconcile(true);needRestart(true);
                notify('K2: рекомендований набір відновлено. Перезапусти Lampa.');
            }
        });
    }

    function style() {
        if(document.getElementById('k2pm-css'))return;
        var s=document.createElement('style');s.id='k2pm-css';
        s.innerHTML='.k2pm-head{padding:1em 1.1em;margin:.5em 0 1em;border-radius:.55em;background:rgba(255,255,255,.08);line-height:1.45}.k2pm-head b{font-size:1.15em}.k2pm-cat{padding:1.3em .55em .45em;opacity:.72;font-weight:700;font-size:1.02em}';
        (document.head||document.documentElement).appendChild(s);
    }

    function countEnabled() {
        var n=0;PLUGINS.forEach(function(p){if(enabled(p))n++;});
        return n;
    }

    function decorate(body) {
        if(!body||!body.length)return;
        style();body.find('.k2pm-head,.k2pm-cat').remove();
        var paired=!!clientToken(),restart=false;
        try{restart=bool(Lampa.Storage.get(RESTART_KEY,false));}catch(e){}
        body.prepend('<div class="k2pm-head"><b>K2 Plugin Manager v'+VERSION+'</b><br>'+
            'Secure Lampac: '+(paired?'✓ підключено':'○ не підключено')+
            ' · Плагінів: '+countEnabled()+
            (restart?'<br>⚠ Після вимкнення потрібен повний перезапуск Lampa.':'<br>✓ Менеджер активний.')+
            '</div>');

        var sec=body.find('[data-name="'+FUNNEL_KEY+'"]').first();
        if(sec.length)sec.before('<div class="k2pm-cat">☁ SECURE LAMPAC / QR PAIRING</div>');
        var ts=body.find('[data-name="k2pm_ts_url"]').first();
        if(ts.length)ts.before('<div class="k2pm-cat">⚙️ LG / TORRSERVER</div>');

        Object.keys(CAT_TITLES).forEach(function(cat){
            var first=null;
            for(var i=0;i<PLUGINS.length;i++){if(PLUGINS[i].cat===cat){first=PLUGINS[i];break;}}
            if(!first)return;
            var row=body.find('[data-name="'+key(first)+'"]').first();
            if(row.length)row.before('<div class="k2pm-cat">'+CAT_TITLES[cat]+'</div>');
        });
    }

    function listenSettings() {
        try{
            Lampa.Settings.listener.follow('open',function(e){
                if(!e||e.name!==COMPONENT)return;
                setTimeout(function(){decorate(e.body);},0);
                setTimeout(function(){decorate(e.body);},200);
            });
        }catch(e){}
    }

    function start() {
        if(window.__K2_PLUGIN_MANAGER_STARTED__)return;
        window.__K2_PLUGIN_MANAGER_STARTED__=true;

        try{
            if(!Lampa.Storage.get(FUNNEL_KEY,''))Lampa.Storage.set(FUNNEL_KEY,DEFAULT_FUNNEL);
            if(!Lampa.Storage.get('k2pm_ts_url',''))Lampa.Storage.set('k2pm_ts_url','http://127.0.0.1:8090');
            if(!Lampa.Storage.get('torrserver_url',''))Lampa.Storage.set('torrserver_url','http://127.0.0.1:8090');
        }catch(e){}

        setupSettings();
        listenSettings();
        var r=reconcile(true);
        if(!r.changed)needRestart(false);

        window.K2PluginManager={
            version:VERSION,
            pair:startPairing,
            sync:function(){return reconcile(true);},
            checkLampac:checkSecureLampac,
            checkTorrServer:checkTorrServer
        };
        log('ready',r);
    }

    function boot() {
        if(!window.Lampa||!Lampa.Storage||!Lampa.Plugins||!Lampa.SettingsApi){
            setTimeout(boot,150);return;
        }
        if(window.appready)start();
        else if(Lampa.Listener&&Lampa.Listener.follow){
            Lampa.Listener.follow('app',function(e){if(e&&e.type==='ready')start();});
            setTimeout(function(){if(window.appready)start();},1500);
        } else start();
    }

    boot();
})();
