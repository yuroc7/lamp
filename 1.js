/*
 * K2 Plugin Manager for Lampa
 * File: 1.js
 * Version: 3.2.0
 *
 * K2 Lampac pairing:
 *   QR -> K2 сервер -> Admin PIN -> unique per-TV token
 *
 * Public сервер URL is safe to embed; NO secret token is embedded here.
 */
(function () {
    'use strict';

    var VERSION = '3.2.0';
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
    var PROFILE_VERSION_KEY = 'k2pm_profile_version';
    var START_PAGE_KEY = 'k2pm_start_page';
    var IPTV_PRESET_KEY = 'k2pm_iptv_preset';
    var PROFILE_VERSION = 310;
    var HEALTH_CACHE_KEY = 'k2pm_plugin_health_v1';
    var HEALTH_AUTO_KEY = 'k2pm_plugin_health_auto';
    var HEALTH_TTL = 6 * 60 * 60 * 1000;
    var healthBusy = false;
    var currentSettingsBody = null;

    var IPTV_PRESETS = {
        ua: {title:'🇺🇦 Україна — публічні канали',url:'https://iptv-org.github.io/iptv/countries/ua.m3u'},
        ukr: {title:'🇺🇦 Україномовні — весь світ',url:'https://iptv-org.github.io/iptv/languages/ukr.m3u'},
        sports: {title:'⚽ Спорт — світ',url:'https://iptv-org.github.io/iptv/categories/sports.m3u'},
        news: {title:'📰 Новини — світ',url:'https://iptv-org.github.io/iptv/categories/news.m3u'},
        movies: {title:'🎬 Кіно — світ',url:'https://iptv-org.github.io/iptv/categories/movies.m3u'},
        kids: {title:'🧒 Дитячі — світ',url:'https://iptv-org.github.io/iptv/categories/kids.m3u'},
        music: {title:'🎵 Музика — світ',url:'https://iptv-org.github.io/iptv/categories/music.m3u'},
        world: {title:'🌍 Усі категорії — світ',url:'https://iptv-org.github.io/iptv/index.category.m3u'}
    };

    if (window.__K2_PLUGIN_MANAGER_320__) return;
    window.__K2_PLUGIN_MANAGER_320__ = true;

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
        // ONLINE — багато джерел одразу після встановлення K2.
        {id:'online_mod',cat:'online',name:'Online MOD',desc:'Основне онлайн-джерело з власним вибором балансерів.',url:'https://nb557.github.io/plugins/online_mod.js',on:true},
        {id:'cinema',cat:'online',name:'Cinema',desc:'Окремий community-плагін для фільмів/серіалів і навігації.',url:'https://bylampa.github.io/cinema.js',on:true},
        {id:'filmix',cat:'online',name:'Filmix',desc:'Окреме джерело Filmix.',url:'https://lampaplugins.github.io/store/fx.js',on:true},
        {id:'prestige',cat:'online',name:'Prestige',desc:'Додаткове онлайн-джерело з актуального community-каталогу.',url:'https://bwa.to/plugins/prestige.js',on:true},
        {id:'nmprs',cat:'online',name:'NMPRS 4K',desc:'Додаткове онлайн-джерело з підтримкою 4K.',url:'https://num.jac-red.ru/plugin/nmprs.js',on:true},
        {id:'smotret24',cat:'online',name:'Smotret24',desc:'Ще одне безкоштовне онлайн-джерело Full HD.',url:'http://smotret24.ru/online.js',on:true},
        {id:'videocdn',cat:'online',name:'VideoCDN',desc:'Резервне відеоджерело. HTTP, тому на окремих збірках може блокуватися.',url:'http://skaz.tv/vcdn.js',on:true},
        {id:'bwa',cat:'online',name:'BWA Online',desc:'Додаткове онлайн-джерело.',url:'https://bwa.to/rc',on:true},
        {id:'showy',cat:'online',name:'Showy',desc:'Додатковий онлайн-кінотеатр. HTTP-джерело.',url:'http://showy.online/m.js',on:true},
        {id:'modss',cat:'online',name:"MODS's",desc:'Колекція балансерів і додаткових онлайн-джерел.',url:'http://lampa.stream/modss',on:true},
        {id:'stream1',cat:'online',name:'Online Stream',desc:'Онлайн-джерело з кількома балансерами.',url:'http://arkmv.ru/vod',on:true},
        {id:'stream2',cat:'online',name:'Online Stream 2',desc:'Додаткове резервне онлайн-джерело.',url:'http://llpp.in/v/vod.js',on:true},

        // TORRENTS — TorrServer уже локально на LG.
        {id:'etor',cat:'torrent',name:'Etor: Parser + TorrServer',desc:'На LG/Tizen відкриває штатні пункти Парсер і TorrServer.',url:'http://cub.red/plugin/etor',on:true},
        {id:'pubtorr',cat:'torrent',name:'PubTorr',desc:'Публічні торрент-парсери без власного Jackett.',url:'https://lampame.github.io/main/pubtorr.js',on:true},
        {id:'ts_settings',cat:'torrent',name:'TorrServer Settings',desc:'Керування налаштуваннями TorrServer з Lampa.',url:'https://lampaplugins.github.io/store/pavelpikta/torrserver-settings.js',on:true},
        {id:'torrent_styles',cat:'torrent',name:'Torrent Styles MOD V2',desc:'Зручніший список торрентів: розмір, сіди, піри, бітрейт.',url:'https://lampaplugins.github.io/store/torrent_styles_v2.js',on:true},
        {id:'ts_preload',cat:'torrent',name:'TS Preload',desc:'Показує буферизацію TorrServer.',url:'https://plugin.rootu.top/ts-preload.js',on:true},
        {id:'no_autostart',cat:'torrent',name:'No Autostart',desc:'Не запускає торрент автоматично — спочатку дає вибір.',url:'https://lampaplugins.github.io/store/no-autostart.js',on:true},

        // 18+
        {id:'bwa18',cat:'adult',name:'BWA 18+',desc:'18+ агрегатор із багатьма джерелами.',url:'http://bwa.ad/re',on:false},
        {id:'xsena18',cat:'adult',name:'Xsena 18+',desc:'18+ агрегатор із великою кількістю джерел.',url:'http://e.xsena.red',on:false},

        // COLLECTIONS
        {id:'collections',cat:'collections',name:'Netflix / Apple TV / HBO Max',desc:'Категорії стримінгових сервісів у каталозі Lampa.',url:'https://tvigl.github.io/plugins/collections.js',on:true},
        {id:'more_categories',cat:'collections',name:'Додаткові категорії',desc:'Ще більше тематичних категорій і підбірок.',url:'https://lampame.github.io/main/nc/nc.js',on:true},
        {id:'dorama_direct',cat:'collections',name:'Дорами',desc:'Окремий розділ дорам. За замовчуванням OFF, щоб не дублювати інші каталоги.',url:'https://tvigl.github.io/plugins/dorama.js',on:false},
        {id:'surs',cat:'collections',name:'SURS',desc:'Динамічні підбірки за жанрами, сервісами та популярністю.',url:'https://aviamovie.github.io/surs.js',on:false},

        // TV / IPTV / SPORT
        {id:'iptv',cat:'tv',name:'IPTV M3U + EPG',desc:'M3U, групи каналів, EPG, обране, історія й пошук. K2 має готові безкоштовні пресети.',url:'https://cdn.jsdelivr.net/gh/smackftw/lampa_iptv@main/dist/lampa-iptv.js',on:true},
        {id:'sport',cat:'tv',name:'Sport (CUB)',desc:'Додатковий спортивний розділ CUB.',url:'https://cub.red/plugin/sport',on:true},
        {id:'cinema_archive',cat:'tv',name:'Cinema Archive',desc:'Додатковий TV/архів-плагін.',url:'https://bywolf88.github.io/lampa-plugins/cinemabywolf.js',on:true},
        {id:'diesel_tv',cat:'tv',name:'Diesel TV',desc:'Додатковий TV-плагін; за замовчуванням OFF.',url:'https://andreyurl54.github.io/diesel5/diesel.js',on:false},
        {id:'skaz_tv',cat:'tv',name:'TV by Skaz',desc:'Додаткове IPTV/TV HTTP-джерело.',url:'http://skaz.tv/tv.js',on:false},

        // DESIGN — безпечні модулі ON, агресивні редизайни OFF.
        {id:'logo_title',cat:'design',name:'Logo Instead Title',desc:'Показує логотип замість простого текстового заголовка. Легкий мод.',url:'https://lampaplugins.github.io/store/logo.js',on:true},
        {id:'maxsm_ratings',cat:'design',name:'Maxsm Ratings',desc:'Акуратні рейтинги на картках без повного редизайну.',url:'https://tvigl.github.io/plugins/maxsm_ratings.js',on:true},
        {id:'surs_quality',cat:'design',name:'Surs Quality',desc:'Показує доступну якість на картках.',url:'https://tvigl.github.io/plugins/surs_quality.js',on:true},
        {id:'tv_buttons',cat:'design',name:'TV Buttons',desc:'Зручні кнопки/іконки у виборі джерел.',url:'https://apxubatop.github.io/lmpPlugs/tvbutton.js',on:true},
        {id:'categories_nav',cat:'design',name:'Categories',desc:'Додаткові категорії та зручніша навігація.',url:'https://lampame.github.io/main/newcategory.js',on:true},
        {id:'interface_enhancement',cat:'design',name:'Interface Enhancement',desc:'Сильніше змінює інтерфейс. OFF, щоб не повторити проблему з карткою фільму.',url:'https://bylampa.github.io/interface.js',on:false},
        {id:'gold_theme',cat:'design',name:'Golden Theme',desc:'Золотиста тема оформлення.',url:'https://bazzzilius.github.io/scripts/gold_theme.js',on:false},
        {id:'new_interface',cat:'design',name:'New Interface',desc:'Повний альтернативний інтерфейс — експериментальний.',url:'https://bywolf88.github.io/lampa-plugins/interface_mod_new.js',on:false},
        {id:'cardify',cat:'design',name:'Cardify',desc:'Суттєво змінює картки. OFF через можливі конфлікти.',url:'https://bylampa.github.io/cardify.js',on:false},
        {id:'themes',cat:'design',name:'Themes',desc:'Додаткові теми оформлення.',url:'https://bylampa.github.io/themes.js',on:false},
        {id:'start_screen',cat:'design',name:'Start Screen',desc:'Кастомізація стартового екрану. Не потрібен для старту з Історії.',url:'https://bylampa.github.io/start.js',on:false},
        {id:'top_bar',cat:'design',name:'Top Bar',desc:'Додаткова верхня інформаційна панель.',url:'https://tvigl.github.io/plugins/top_bar.js',on:false},
        {id:'head_filter',cat:'design',name:'Налаштування шапки',desc:'Дозволяє приховувати зайві елементи верхньої панелі.',url:'https://and7ey.github.io/lampa/head_filter.js',on:false},
        {id:'source_enhancement',cat:'design',name:'Source Enhancement',desc:'Додаткові постери/метадані та оформлення джерел.',url:'https://bylampa.github.io/source.js',on:false},

        // USEFUL
        {id:'subs',cat:'utils',name:'Improved Subtitles',desc:'Покращені субтитри; особливо корисно на LG webOS.',url:'https://adambenhassen.github.io/subs.js',on:true},
        {id:'source_sort',cat:'utils',name:'Сортування онлайн-джерел',desc:'Керує порядком джерел, коли їх багато.',url:'https://tvigl.github.io/plugins/source_sort.js',on:true},
        {id:'balancer_sanitizer',cat:'utils',name:'Очищення балансерів',desc:'Допомагає прибирати непотрібні/проблемні балансери.',url:'https://levende.github.io/lampa-plugins/balancer-sanitizer.js',on:true},
        {id:'history_filter',cat:'utils',name:'Фільтр історії',desc:'Покращує роботу зі списком історії — корисно, бо K2 стартує з Історії.',url:'https://levende.github.io/lampa-plugins/history-filter.js',on:true},
        {id:'lampac_filter',cat:'utils',name:'Lampac Source Filter',desc:'Фільтр джерел Lampac. OFF, щоб спочатку показувати максимум.',url:'https://levende.github.io/lampa-plugins/lampac-src-filter.js',on:false},
        {id:'itunes_trailers',cat:'utils',name:'Трейлери iTunes',desc:'Додаткове джерело трейлерів.',url:'https://plugin.rootu.top/trailers.js',on:true},
        {id:'yummy',cat:'utils',name:'YummyAnime',desc:'Аніме-каталог, списки, рейтинги та прогрес.',url:'https://yummyanime.github.io/yummy-lampa-plugin/stable/index.js',on:false},
        {id:'qr_keyboard',cat:'utils',name:'QR-клавіатура',desc:'Введення тексту в Lampa з телефона через QR.',url:'https://fv.plymo.ru/p/kb.js',on:false},
        {id:'cub_rating',cat:'utils',name:'Рейтинг CUB',desc:'Додатковий рейтинг CUB. OFF, бо вже є Maxsm Ratings.',url:'https://plugin.rootu.top/cub-rating.js',on:false},
        {id:'record',cat:'utils',name:'Радіо Record',desc:'Радіо Record прямо в Lampa.',url:'https://lampaplugins.github.io/store/record.js',on:false},
        {id:'somafm',cat:'utils',name:'SomaFM',desc:'Безкоштовні інтернет-радіостанції SomaFM.',url:'https://tsynik.github.io/lampa/soma.js',on:false}
    ];

    var CAT_TITLES = {
        online:'🎬 ОНЛАЙН-КІНОТЕАТРИ / БАЛАНСЕРИ',
        torrent:'🧲 ТОРРЕНТИ / TORRSERVER',
        adult:'🔞 18+',
        collections:'🍿 NETFLIX / APPLE TV / HBO / ПІДБІРКИ',
        tv:'📺 IPTV / ТБ / СПОРТ',
        design:'🎨 ДИЗАЙН',
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
        var u = DEFAULT_FUNNEL;

        // Migration only: if an older version already stored the same server URL,
        // accept it internally, but never expose it in the settings UI.
        try {
            var old = Lampa.Storage.get(FUNNEL_KEY, '');
            if (old) u = old;
        } catch (e) {}

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
            notify('K2: Сервер K2 Lampac недоступний або pairing тимчасово заблокований');
        });
    }

    function checkSecureLampac() {
        var t = clientToken();
        if (!t) return notify('K2 Lampac ще не підключений. Використай QR pairing.');
        ajax('GET', baseUrl() + '/k2/me?token=' + encodeURIComponent(t), null, function(r) {
            if (r.ok) notify('✓ K2 Lampac: ' + (r.device_name || 'TV') + ' авторизований');
            else notify('✕ Token не прийнято');
        }, function(){ notify('✕ K2 Lampac недоступний'); });
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
            notify('Token видалено з TV, але сервер був недоступний для відкликання.');
        });
    }

    function getStorage(name, def) {
        try {
            var value = Lampa.Storage.get(name, def);
            return typeof value === 'undefined' || value === null ? def : value;
        } catch (e) {
            return def;
        }
    }

    function setStorage(name, value) {
        try { Lampa.Storage.set(name, value); } catch (e) {}
    }

    function setStartPage(value, quiet) {
        var allowed = {
            'favorite@history':1,
            'main':1,
            'favorite@bookmarks':1,
            'mytorrents':1,
            'last':1
        };
        if (!allowed[value]) value = 'favorite@history';
        setStorage(START_PAGE_KEY, value);
        setStorage('start_page', value);
        if (!quiet) notify('Стартова сторінка змінена. Застосується після наступного запуску Lampa.');
    }

    function applyIptvPreset(value, quiet) {
        var preset = IPTV_PRESETS[value] || IPTV_PRESETS.ua;
        setStorage(IPTV_PRESET_KEY, IPTV_PRESETS[value] ? value : 'ua');
        setStorage('liptv_m3u_url', preset.url);
        setStorage('liptv_epg_source', 'auto');
        if (!getStorage('liptv_view_mode', '')) setStorage('liptv_view_mode', 'list');
        if (!quiet) notify('IPTV: ' + preset.title + '. EPG = Авто.');
    }

    function applyGlassPreset(quiet) {
        setStorage('animation', true);
        setStorage('background', true);
        setStorage('glass_style', true);
        setStorage('glass_opacity', 'medium');
        setStorage('black_style', false);
        setStorage('advanced_animation', false);
        setStorage('card_quality', true);
        setStorage('card_episodes', true);
        if (!quiet) notify('✓ K2 Glass застосовано. Якщо вигляд не оновився одразу — перезапусти Lampa.');
    }

    function applyOledPreset() {
        setStorage('animation', true);
        setStorage('background', true);
        setStorage('glass_style', true);
        setStorage('glass_opacity', 'blacked');
        setStorage('black_style', true);
        setStorage('advanced_animation', false);
        setStorage('card_quality', true);
        setStorage('card_episodes', true);
        notify('✓ K2 OLED Black застосовано.');
    }

    function applyStandardLook() {
        setStorage('glass_style', false);
        setStorage('black_style', false);
        setStorage('animation', true);
        setStorage('background', true);
        notify('✓ Повернуто базове оформлення Lampa. Зовнішні дизайн-плагіни керуються окремо.');
    }

    function pluginById(id) {
        for (var i = 0; i < PLUGINS.length; i++) if (PLUGINS[i].id === id) return PLUGINS[i];
        return null;
    }

    function applyV310Migration() {
        var version = parseInt(getStorage(PROFILE_VERSION_KEY, 0), 10) || 0;
        if (version >= PROFILE_VERSION) return;

        // New K2 defaults requested for this upgrade.
        [
            'online_mod','cinema','filmix','prestige','nmprs','smotret24','videocdn','bwa','showy','modss','stream1','stream2',
            'etor','pubtorr','ts_settings','torrent_styles','ts_preload','no_autostart',
            'collections','more_categories',
            'iptv','sport','cinema_archive',
            'logo_title','maxsm_ratings','surs_quality','tv_buttons','categories_nav',
            'subs','source_sort','balancer_sanitizer','history_filter','itunes_trailers'
        ].forEach(function(id) {
            var p = pluginById(id);
            if (p) setEnabled(p, true);
        });

        // Keep adult and aggressive full redesigns opt-in.
        ['bwa18','xsena18','interface_enhancement','gold_theme','new_interface','cardify','themes','start_screen','top_bar','head_filter','source_enhancement']
            .forEach(function(id) {
                var p = pluginById(id);
                if (p) setEnabled(p, false);
            });

        setStartPage('favorite@history', true);
        applyIptvPreset('ua', true);
        applyGlassPreset(true);
        setStorage(PROFILE_VERSION_KEY, PROFILE_VERSION);
    }


    function healthCache() {
        try {
            var c = Lampa.Storage.get(HEALTH_CACHE_KEY, null);
            return c && typeof c === 'object' ? c : null;
        } catch (e) { return null; }
    }

    function setHealthCache(c) {
        try { Lampa.Storage.set(HEALTH_CACHE_KEY, c || null); } catch (e) {}
    }

    function healthItems() {
        var list = [];
        PLUGINS.forEach(function(p) {
            list.push({id:p.id,name:p.name,url:p.url});
        });

        var t = clientToken();
        if (t) {
            list.push({id:'__lampac_online',name:'Lampac Online',url:secureOnlineUrl()});
            list.push({id:'__lampac_sisi',name:'SISI',url:secureSisiUrl()});
        }
        return list;
    }

    function healthMap() {
        var c = healthCache(), m = {};
        if (!c || !c.results) return m;
        for (var i=0;i<c.results.length;i++) {
            if (c.results[i] && c.results[i].id) m[c.results[i].id] = c.results[i];
        }
        return m;
    }

    function healthStatusText(r) {
        if (!r) return {cls:'unknown',text:'? не перевірено'};
        if (r.state === 'ok') return {cls:'ok',text:'✓ доступний'};
        if (r.state === 'warn') {
            return {cls:'warn',text:r.http ? ('⚠ HTTP '+r.http) : '⚠ відповідає'};
        }
        if (r.state === 'blocked') return {cls:'warn',text:'⚠ перевірку заблоковано'};
        return {cls:'dead',text:r.http ? ('✕ HTTP '+r.http) : '✕ недоступний'};
    }

    function healthRow(body, dataName, result) {
        if (!body || !body.length) return;
        var row = body.find('[data-name="'+dataName+'"]').first();
        if (!row.length) return;

        row.find('.k2pm-health').remove();
        var s = healthStatusText(result);
        var extra = '';
        if (result && result.ms) extra = ' · '+result.ms+' ms';

        row.append(
            $('<div class="k2pm-health k2pm-health-'+s.cls+'">'+s.text+extra+'</div>')
        );
    }

    function renderHealth(body) {
        if (!body || !body.length) return;
        var map = healthMap();

        PLUGINS.forEach(function(p) {
            healthRow(body, key(p), map[p.id]);
        });

        healthRow(body, LAMPAC_ON_KEY, map.__lampac_online);
        healthRow(body, SISI_ON_KEY, map.__lampac_sisi);

        var c = healthCache();
        var line = body.find('.k2pm-health-summary').first();
        if (!line.length) {
            line = $('<div class="k2pm-health-summary"></div>');
            var trigger = body.find('[data-name="k2pm_check_plugins"]').first();
            if (trigger.length) trigger.before(line);
        }

        if (!c || !c.checked_at) {
            line.html('Статус джерел: ще не перевірено');
            return;
        }

        var sum = c.summary || {};
        var dt = new Date(c.checked_at * 1000);
        var tm = '';
        try {
            tm = ('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2);
        } catch(e) {}

        line.html(
            'Статус джерел: <b>✓ '+(sum.ok||0)+'</b> · '+
            '<b>⚠ '+((sum.warn||0)+(sum.blocked||0))+'</b> · '+
            '<b>✕ '+(sum.dead||0)+'</b>'+
            (tm ? ' · перевірено '+tm : '')
        );
    }

    function checkAllPlugins(manual) {
        if (healthBusy) {
            if (manual) notify('Перевірка вже виконується…');
            return;
        }

        var token = clientToken();
        if (!token) {
            if (manual) notify('Спочатку підключи K2 Lampac через QR.');
            return;
        }

        healthBusy = true;
        if (manual) notify('Перевіряю всі джерела…');

        if (currentSettingsBody && currentSettingsBody.length) {
            currentSettingsBody.find('.k2pm-health-summary').html('⌛ Перевіряю джерела…');
        }

        try {
            var x = new XMLHttpRequest();
            x.open('POST', baseUrl() + '/k2/plugin-health', true);
            x.timeout = 45000;
            x.setRequestHeader('Content-Type','application/json');

            x.onload = function() {
                healthBusy = false;
                var r = null;
                try { r = JSON.parse(x.responseText || '{}'); } catch(e) {}

                if (x.status >= 200 && x.status < 300 && r && r.ok) {
                    setHealthCache(r);
                    if (currentSettingsBody && currentSettingsBody.length) {
                        renderHealth(currentSettingsBody);
                    }

                    if (manual) {
                        var s = r.summary || {};
                        notify(
                            'K2: ✓ '+(s.ok||0)+
                            ' · ⚠ '+((s.warn||0)+(s.blocked||0))+
                            ' · ✕ '+(s.dead||0)
                        );
                    }
                } else if (manual) {
                    notify('Не вдалося отримати статус плагінів.');
                }
            };

            x.onerror = function() {
                healthBusy = false;
                if (manual) notify('Сервер перевірки недоступний.');
            };

            x.ontimeout = function() {
                healthBusy = false;
                if (manual) notify('Перевірка зайняла занадто багато часу.');
            };

            x.send(JSON.stringify({
                token: token,
                plugins: healthItems()
            }));
        } catch(e) {
            healthBusy = false;
            if (manual) notify('Помилка перевірки плагінів.');
        }
    }

    function maybeAutoHealth() {
        var auto = true;
        try { auto = bool(Lampa.Storage.get(HEALTH_AUTO_KEY, true)); } catch(e) {}

        if (!auto || !clientToken() || healthBusy) return;

        var c = healthCache();
        var stale = !c || !c.checked_at ||
            ((Date.now() - c.checked_at*1000) > HEALTH_TTL);

        if (stale) setTimeout(function(){ checkAllPlugins(false); }, 700);
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
            param:{name:'k2pm_pair_secure',type:'trigger',default:false},
            field:{name:'📱 Підключити Lampac через QR',description:'TV покаже QR і короткий код. На телефоні вводиш тільки K2 Admin PIN.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_pair_secure',false);}catch(e){}
                startPairing();
            }
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_secure',type:'trigger',default:false},
            field:{name:'Перевірити K2 Lampac',description:'Перевіряє сервер і авторизацію цього телевізора.'},
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

        addParam({
            component:COMPONENT,
            param:{name:'k2pm_check_plugins',type:'trigger',default:false},
            field:{name:'🔎 Перевірити всі плагіни',description:'Перевірка кожного джерела через K2 сервер. Статус з’явиться прямо під кожним плагіном.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_check_plugins',false);}catch(e){}
                checkAllPlugins(true);
            }
        });

        addParam({
            component:COMPONENT,
            param:{name:HEALTH_AUTO_KEY,type:'trigger',default:true},
            field:{name:'Автоперевірка плагінів',description:'Оновлювати статуси автоматично приблизно раз на 6 годин.'}
        });

        // Startup / behavior.
        addParam({
            component:COMPONENT,
            param:{
                name:START_PAGE_KEY,
                type:'select',
                values:{
                    'favorite@history':'Історія переглядів',
                    'main':'Головна',
                    'favorite@bookmarks':'Закладки',
                    'mytorrents':'Мої торренти',
                    'last':'Останній відкритий екран'
                },
                default:'favorite@history'
            },
            field:{name:'Стартова сторінка',description:'За замовчуванням K2 відкриває Історію переглядів.'},
            onChange:function(v){setStartPage(v,false);}
        });

        // IPTV presets. Custom URL is still available in the IPTV plugin settings.
        addParam({
            component:COMPONENT,
            param:{
                name:IPTV_PRESET_KEY,
                type:'select',
                values:{
                    ua:'🇺🇦 Україна — публічні канали',
                    ukr:'🇺🇦 Україномовні — весь світ',
                    sports:'⚽ Спорт — світ',
                    news:'📰 Новини — світ',
                    movies:'🎬 Кіно — світ',
                    kids:'🧒 Дитячі — світ',
                    music:'🎵 Музика — світ',
                    world:'🌍 Усі категорії — світ'
                },
                default:'ua'
            },
            field:{name:'Готовий IPTV-плейлист',description:'Безкоштовні публічні списки. Окремі канали можуть змінюватися або бути геообмежені.'},
            onChange:function(v){applyIptvPreset(v,false);}
        });

        // Built-in Lampa design presets. Safer than full card redesign plugins.
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_glass_preset',type:'trigger',default:false},
            field:{name:'✨ K2 Glass',description:'Скло + фон + плавна анімація. Не перебудовує картку фільму.'},
            onChange:function(){setStorage('k2pm_glass_preset',false);applyGlassPreset(false);}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_oled_preset',type:'trigger',default:false},
            field:{name:'◼ K2 OLED Black',description:'Темний режим для LG/OLED: чорний фон + затемнене скло.'},
            onChange:function(){setStorage('k2pm_oled_preset',false);applyOledPreset();}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_standard_look',type:'trigger',default:false},
            field:{name:'↩ Стандартний вигляд Lampa',description:'Вимикає K2 Glass/Black; зовнішні дизайн-плагіни лишаються під своїми перемикачами.'},
            onChange:function(){setStorage('k2pm_standard_look',false);applyStandardLook();}
        });

        function addPluginToggle(p) {
            addParam({
                component:COMPONENT,
                param:{name:key(p),type:'trigger',default:!!p.on},
                field:{name:p.name,description:p.desc},
                onChange:function(v){toggle(p,bool(v));}
            });
        }

        // ONLINE: Lampac Online is a normal source, just like the others.
        addParam({
            component:COMPONENT,
            param:{name:LAMPAC_ON_KEY,type:'trigger',default:true},
            field:{name:'Lampac Online',description:'Онлайн-джерела з твого K2 Lampac.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });
        PLUGINS.forEach(function(p){ if(p.cat==='online') addPluginToggle(p); });

        // TORRENTS
        PLUGINS.forEach(function(p){ if(p.cat==='torrent') addPluginToggle(p); });

        // 18+: SISI is intentionally a normal item in the same list.
        addParam({
            component:COMPONENT,
            param:{name:SISI_ON_KEY,type:'trigger',default:false},
            field:{name:'SISI',description:'18+ джерела SISI з K2 Lampac.'},
            onChange:function(){syncSecureLampac(true);needRestart(true);}
        });
        PLUGINS.forEach(function(p){ if(p.cat==='adult') addPluginToggle(p); });

        // COLLECTIONS / TV / DESIGN / UTILS
        PLUGINS.forEach(function(p){ if(p.cat==='collections') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='tv') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='design') addPluginToggle(p); });
        PLUGINS.forEach(function(p){ if(p.cat==='utils') addPluginToggle(p); });

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
            field:{name:'Рекомендований набір K2',description:'Багато онлайн-джерел + торренти + IPTV UA + K2 Glass + безпечні дизайн-моди + корисні інструменти.'},
            onChange:function(){
                try{Lampa.Storage.set('k2pm_defaults',false);}catch(e){}
                PLUGINS.forEach(function(p){setEnabled(p,!!p.on);});
                setStartPage('favorite@history',true);
                applyIptvPreset('ua',true);
                applyGlassPreset(true);
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
        currentSettingsBody = body;
        style();body.find('.k2pm-head,.k2pm-cat').remove();
        var paired=!!clientToken(),restart=false;
        try{restart=bool(Lampa.Storage.get(RESTART_KEY,false));}catch(e){}
        body.prepend('<div class="k2pm-head"><b>K2 Plugin Manager v'+VERSION+'</b><br>'+
            'K2 Lampac: '+(paired?'✓ підключено':'○ не підключено')+
            ' · Плагінів: '+countEnabled()+
            (restart?'<br>⚠ Після вимкнення потрібен повний перезапуск Lampa.':'<br>✓ Менеджер активний.')+
            '</div>');

        var sec=body.find('[data-name="k2pm_pair_secure"]').first();
        if(sec.length)sec.before('<div class="k2pm-cat">☁ K2 LAMPAC</div>');
        var ts=body.find('[data-name="k2pm_ts_url"]').first();
        if(ts.length)ts.before('<div class="k2pm-cat">⚙️ LG / TORRSERVER</div>');

        var hs=body.find('[data-name="k2pm_check_plugins"]').first();
        if(hs.length)hs.before('<div class="k2pm-cat">🩺 СТАН ПЛАГІНІВ</div>');

        var sp=body.find('[data-name="'+START_PAGE_KEY+'"]').first();
        if(sp.length)sp.before('<div class="k2pm-cat">🏠 ЗАПУСК / ПОВЕДІНКА</div>');

        var ip=body.find('[data-name="'+IPTV_PRESET_KEY+'"]').first();
        if(ip.length)ip.before('<div class="k2pm-cat">📺 IPTV — ГОТОВІ ПЛЕЙЛИСТИ</div>');

        var look=body.find('[data-name="k2pm_glass_preset"]').first();
        if(look.length)look.before('<div class="k2pm-cat">✨ K2 ВИГЛЯД</div>');

        Object.keys(CAT_TITLES).forEach(function(cat){
            var row = null;

            if (cat === 'online') {
                row = body.find('[data-name="'+LAMPAC_ON_KEY+'"]').first();
            } else if (cat === 'adult') {
                row = body.find('[data-name="'+SISI_ON_KEY+'"]').first();
            }

            if (!row || !row.length) {
                var first=null;
                for(var i=0;i<PLUGINS.length;i++){if(PLUGINS[i].cat===cat){first=PLUGINS[i];break;}}
                if(first) row=body.find('[data-name="'+key(first)+'"]').first();
            }

            if(row && row.length)row.before('<div class="k2pm-cat">'+CAT_TITLES[cat]+'</div>');
        });

        renderHealth(body);
    }

    function listenSettings() {
        try{
            Lampa.Settings.listener.follow('open',function(e){
                if(!e||e.name!==COMPONENT)return;
                setTimeout(function(){decorate(e.body);},0);
                setTimeout(function(){decorate(e.body);},200);
                setTimeout(function(){maybeAutoHealth();},500);
            });
        }catch(e){}
    }

    function start() {
        if(window.__K2_PLUGIN_MANAGER_STARTED__)return;
        window.__K2_PLUGIN_MANAGER_STARTED__=true;

        try{
            if(!Lampa.Storage.get('k2pm_ts_url',''))Lampa.Storage.set('k2pm_ts_url','http://127.0.0.1:8090');
            if(!Lampa.Storage.get('torrserver_url',''))Lampa.Storage.set('torrserver_url','http://127.0.0.1:8090');
        }catch(e){}

        applyV310Migration();
        setupSettings();
        listenSettings();
        var r=reconcile(true);
        if(!r.changed)needRestart(false);

        window.K2PluginManager={
            version:VERSION,
            pair:startPairing,
            sync:function(){return reconcile(true);},
            checkLampac:checkSecureLampac,
            checkTorrServer:checkTorrServer,
            checkPlugins:function(){checkAllPlugins(true);},
            pluginHealth:healthCache
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
