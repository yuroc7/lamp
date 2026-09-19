/*
 * Y7 Media for Lampa
 * File: 1.js
 * Version: 4.4.0
 *
 * K2 Lampac pairing:
 *   QR -> K2 сервер -> Admin PIN -> unique per-TV token
 *
 * Public сервер URL is safe to embed; NO secret token is embedded here.
 */
/* K2 bootstrap: securely cached client update, activated only after SHA-256 verification. */
(function(K2_HARD){
    var skip=false;
    function vt(v){var a=String(v||'0').match(/\d+/g)||[];return [+(a[0]||0),+(a[1]||0),+(a[2]||0),+(a[3]||0)];}
    function newer(a,b){a=vt(a);b=vt(b);for(var i=0;i<4;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}
    try{
        var cv=localStorage.getItem('k2_client_cache_version')||'';
        var cc=localStorage.getItem('k2_client_cache_code')||'';
        if(cc&&newer(cv,K2_HARD)){(0,eval)(cc);skip=true;}
    }catch(e){}
    if(skip)return;
(function () {
    'use strict';

    var VERSION = '4.4.0';
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
    var PROFILE_VERSION = 400;
    var HEALTH_CACHE_KEY = 'k2pm_plugin_health_v1';
    var HEALTH_AUTO_KEY = 'k2pm_plugin_health_auto';
    var HEALTH_TTL = 6 * 60 * 60 * 1000;
    var SYNC_ON_KEY = 'k2pm_lampac_sync';
    var REGISTERED_SYNC_KEY = 'k2pm_registered_lampac_sync';
    var KIDS_MODE_KEY = 'k2pm_kids_mode';
    var QUALITY_MIN_KEY = 'k2pm_quality_min';
    var QUALITY_UA_KEY = 'k2pm_quality_ua';
    var QUALITY_CAM_KEY = 'k2pm_quality_hide_cam';
    var QUALITY_WORKING_KEY = 'k2pm_quality_working';
    var UPDATE_CHANNEL_KEY = 'k2pm_update_channel';
    var EXTRA_PLUGINS_KEY = 'k2pm_extra_plugins';
    var HEALTH_FAIL_KEY = 'k2pm_health_fail_counts';
    var HEALTH_SUPPRESS_KEY = 'k2pm_health_suppressed';
    var TORR_LAST_KEY = 'k2pm_torr_last_ok';
    var HEARTBEAT_TIMER = null;
    var COMMAND_TIMER = null;
    var REMOTE_ADMIN_UNTIL = 0;
    var REMOTE_GUEST_UNTIL = 0;
    var REMOTE_GUEST_POLLING = false;
    var FULL_COMPONENT = 'k2_plugin_manager_full';
    var FULL_OPENING = false;
    var healthBusy = false;
    var currentSettingsBody = null;

    var IPTV_PRESETS = {
        ua: {title:'Україна — кращі публічні канали',fallback:'https://iptv-org.github.io/iptv/countries/ua.m3u'},
        ukr: {title:'Україномовні — весь світ',fallback:'https://iptv-org.github.io/iptv/languages/ukr.m3u'},
        football: {title:'Футбол — безкоштовні публічні',fallback:'https://iptv-org.github.io/iptv/categories/sports.m3u'},
        sports: {title:'Спорт — світ',fallback:'https://iptv-org.github.io/iptv/categories/sports.m3u'},
        kids_ua: {title:'Дітям — українське',fallback:'https://iptv-org.github.io/iptv/countries/ua.m3u'},
        kids_world: {title:'Дітям — світ',fallback:'https://iptv-org.github.io/iptv/categories/kids.m3u'},
        animation: {title:'Мультфільми / анімація',fallback:'https://iptv-org.github.io/iptv/categories/animation.m3u'},
        education: {title:'Пізнавальне / освіта',fallback:'https://iptv-org.github.io/iptv/categories/education.m3u'},
        news: {title:'Новини — світ',fallback:'https://iptv-org.github.io/iptv/categories/news.m3u'},
        movies: {title:'Кіно — світ',fallback:'https://iptv-org.github.io/iptv/categories/movies.m3u'},
        music: {title:'Музика — світ',fallback:'https://iptv-org.github.io/iptv/categories/music.m3u'},
        world: {title:'Усі категорії — світ',fallback:'https://iptv-org.github.io/iptv/index.category.m3u'}
    };

    if (window.__K2_PLUGIN_MANAGER_440__) return;
    window.__K2_PLUGIN_MANAGER_440__ = true;

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

        // KIDS — light menu/catalog additions; Kids Mode itself is managed by K2.
        {id:'cartoons_menu',cat:'kids',name:'Мультфільми в меню',desc:'Додає окремий розділ мультфільмів. Опціонально: upstream архівований, тому K2 не вмикає його примусово.',url:'https://k03mad.github.io/lampa/plugins/add-mult.js',on:false},

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
        {id:'top_bar',cat:'design',name:'Top Bar',desc:'Додаткова верхня інформаційна панель.',url:'https://tvigl.github.io/plugins/top_bar.js',on:false},
        {id:'head_filter',cat:'design',name:'Налаштування шапки',desc:'Дозволяє приховувати зайві елементи верхньої панелі.',url:'https://and7ey.github.io/lampa/head_filter.js',on:false},
        {id:'source_enhancement',cat:'design',name:'Source Enhancement',desc:'Додаткові постери/метадані та оформлення джерел.',url:'https://bylampa.github.io/source.js',on:false},

        // CURATED / DISCOVERY — verified public community URLs.
        {id:'tmdb_networks',cat:'collections',name:'TMDB Networks',desc:'Окремі мережі/стримінги: Netflix, HBO, Apple та інші TMDB networks.',url:'https://levende.github.io/lampa-plugins/tmdb-networks.js',on:true},
        {id:'random_scheduled',cat:'utils',name:'Що подивитись? Random',desc:'Швидкий випадковий вибір контенту без зміни стартового екрану.',url:'https://levende.github.io/lampa-plugins/random-scheduled.js',on:true},
        {id:'trash_filter',cat:'utils',name:'Trash Filter',desc:'Прибирає сміттєві/небажані результати з каталогів.',url:'https://levende.github.io/lampa-plugins/trash-filter.js',on:true},
        {id:'tv_status_color',cat:'utils',name:'TV Status Color',desc:'Легке кольорове позначення статусів серіалів/TV без повного редизайну.',url:'https://levende.github.io/lampa-plugins/tv-status-color.js',on:false},

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
        online:'ОНЛАЙН-КІНОТЕАТРИ / БАЛАНСЕРИ',
        torrent:'ТОРРЕНТИ / TORRSERVER',
        adult:'18+',
        collections:'NETFLIX / APPLE TV / HBO / ПІДБІРКИ',
        kids:'ДІТЯМ / МУЛЬТФІЛЬМИ',
        tv:'IPTV / ТБ / СПОРТ',
        design:'ДИЗАЙН',
        utils:'КОРИСНЕ'
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
                author:'Y7 Media'
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

    function secureSyncUrl() {
        var t = clientToken();
        return t ? baseUrl() + '/sync/js/' + encodeURIComponent(t) : '';
    }

    function k2Api(path) {
        return baseUrl() + path;
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
        var sisiOn = bool(Lampa.Storage.get(SISI_ON_KEY, false)) && !bool(getStorage(KIDS_MODE_KEY,false));
        var syncOn = bool(Lampa.Storage.get(SYNC_ON_KEY, true));
        var nextOnline = token && onlineOn ? secureOnlineUrl() : '';
        var nextSisi = token && sisiOn ? secureSisiUrl() : '';
        var nextSync = token && syncOn ? secureSyncUrl() : '';
        var prevOnline = registeredValue(REGISTERED_ONLINE_KEY);
        var prevSisi = registeredValue(REGISTERED_SISI_KEY);
        var prevSync = registeredValue(REGISTERED_SYNC_KEY);
        var added = [], changed = false;

        function replaceOne(prev, next, regkey, name) {
            if (prev && norm(prev) !== norm(next)) {
                if (remove(prev)) changed = true;
                setRegistered(regkey, ''); needRestart(true);
            }
            if (next && add(next, {name:name})) { added.push(next); changed = true; }
            if (next) setRegistered(regkey,next); else setRegistered(regkey,'');
        }
        replaceOne(prevOnline,nextOnline,REGISTERED_ONLINE_KEY,'K2 Lampac Online');
        replaceOne(prevSisi,nextSisi,REGISTERED_SISI_KEY,'K2 Lampac SISI');
        replaceOne(prevSync,nextSync,REGISTERED_SYNC_KEY,'K2 Lampac Sync');

        if (changed) save();
        if (loadNow) load(added);
        return changed;
    }

    function managedList() {
        var a = PLUGINS.map(function(p){ return p.url; });
        var x = registeredValue(REGISTERED_ONLINE_KEY);
        var y = registeredValue(REGISTERED_SISI_KEY);
        var z = registeredValue(REGISTERED_SYNC_KEY);
        if (x) a.push(x);
        if (y) a.push(y);
        if (z) a.push(z);
        return a;
    }

    function extraPlugins() {
        var a=getStorage(EXTRA_PLUGINS_KEY,[]); return a && a.push ? a : [];
    }
    function saveExtraPlugins(a){ setStorage(EXTRA_PLUGINS_KEY,a||[]); }
    function addExtraPlugin(item) {
        if(!item||!item.url||!/^https?:\/\//i.test(item.url))return false;
        var a=extraPlugins();
        for(var i=0;i<a.length;i++)if(norm(a[i].url)===norm(item.url))return false;
        a.push({id:item.id||('extra_'+Date.now()),name:item.name||'Extra plugin',url:item.url,on:true,quarantine:false});
        saveExtraPlugins(a); add(item.url,{name:item.name||'Extra plugin'}); save(); load([item.url]); return true;
    }

    function reconcile(loadNow) {
        enforceKidsRestrictions();
        var added=[], changed=false, wanted={}, old=[];
        PLUGINS.forEach(function(p){ wanted[norm(p.url)] = enabled(p); });

        try { old = Lampa.Storage.get(MANAGED_KEY, []) || []; } catch (e) {}

        old.forEach(function(url) {
            var isSecure = norm(url) === norm(registeredValue(REGISTERED_ONLINE_KEY)) ||
                           norm(url) === norm(registeredValue(REGISTERED_SISI_KEY)) ||
                           norm(url) === norm(registeredValue(REGISTERED_SYNC_KEY));
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

        extraPlugins().forEach(function(ep){ if(ep.on!==false && add(ep.url,ep)){changed=true;added.push(ep.url);} });
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
            title:'Y7 Media — безпечне підключення',
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
                        Lampa.Storage.set(SYNC_ON_KEY, true);
                    } catch (e) {}

                    syncSecureLampac(true);
                    try { Lampa.Storage.set(MANAGED_KEY, managedList()); } catch (e2) {}

                    box.find('.k2-pair-state').html('✓ <b>Підключено.</b> Lampac Online додано автоматично.');
                    notify('✓ Y7 Core підключено');
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
            notify('K2: Сервер Y7 Core недоступний або pairing тимчасово заблокований');
        });
    }

    function checkSecureLampac() {
        var t = clientToken();
        if (!t) return notify('Y7 Core ще не підключений. Використай QR.');
        ajax('GET', baseUrl() + '/k2/me?token=' + encodeURIComponent(t), null, function(r) {
            if (r.ok) notify('✓ Y7 Core: ' + (r.device_name || 'TV') + ' авторизований');
            else notify('✕ Token не прийнято');
        }, function(){ notify('✕ Y7 Core недоступний'); });
    }

    function forgetSecureLampac() {
        var token = clientToken();

        function clearLocal() {
            var a = registeredValue(REGISTERED_ONLINE_KEY);
            var b = registeredValue(REGISTERED_SISI_KEY);
            var c = registeredValue(REGISTERED_SYNC_KEY);
            if (a) remove(a);
            if (b) remove(b);
            if (c) remove(c);
            save();
            setRegistered(REGISTERED_ONLINE_KEY,'');
            setRegistered(REGISTERED_SISI_KEY,'');
            setRegistered(REGISTERED_SYNC_KEY,'');
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

    function iptvUrl(value) {
        var preset=IPTV_PRESETS[value]||IPTV_PRESETS.ua;
        var t=clientToken();
        return t ? (baseUrl()+'/k2/iptv.m3u?preset='+encodeURIComponent(value)+'&token='+encodeURIComponent(t)) : preset.fallback;
    }

    function applyIptvPreset(value, quiet) {
        var preset = IPTV_PRESETS[value] || IPTV_PRESETS.ua;
        value = IPTV_PRESETS[value] ? value : 'ua';
        setStorage(IPTV_PRESET_KEY, value);
        setStorage('liptv_m3u_url', iptvUrl(value));
        setStorage('liptv_epg_source', 'auto');
        if (!getStorage('liptv_view_mode', '')) setStorage('liptv_view_mode', 'list');
        if (!quiet) notify('IPTV: ' + preset.title + '. K2 обирає/кешує кращі потоки; EPG = Авто.');
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
        if (!quiet) notify('✓ Y7 Glass застосовано. Якщо вигляд не оновився одразу — перезапусти Lampa.');
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
        notify('✓ Y7 OLED Black застосовано.');
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

    function applyV400Migration() {
        var version=parseInt(getStorage(PROFILE_VERSION_KEY,0),10)||0;
        if(version>=PROFILE_VERSION)return;
        ['tmdb_networks','random_scheduled','trash_filter'].forEach(function(id){var p=pluginById(id);if(p)setEnabled(p,true);});
        if(getStorage(SYNC_ON_KEY,'__missing__')==='__missing__')setStorage(SYNC_ON_KEY,true);
        if(getStorage(QUALITY_MIN_KEY,'__missing__')==='__missing__')setStorage(QUALITY_MIN_KEY,720);
        if(getStorage(QUALITY_UA_KEY,'__missing__')==='__missing__')setStorage(QUALITY_UA_KEY,true);
        if(getStorage(QUALITY_CAM_KEY,'__missing__')==='__missing__')setStorage(QUALITY_CAM_KEY,true);
        if(getStorage(QUALITY_WORKING_KEY,'__missing__')==='__missing__')setStorage(QUALITY_WORKING_KEY,true);
        if(getStorage(UPDATE_CHANNEL_KEY,'__missing__')==='__missing__')setStorage(UPDATE_CHANNEL_KEY,'stable');
        setStorage(PROFILE_VERSION_KEY,PROFILE_VERSION);
        sendPolicy(true);
    }

    function showHtmlModal(title, htmlText) {
        try { Lampa.Modal.open({title:title,html:$('<div style="padding:1em;line-height:1.45">'+htmlText+'</div>'),size:'medium',onBack:function(){Lampa.Modal.close();}}); }
        catch(e){ notify(title); }
    }

    function sendPolicy(quiet) {
        var t=clientToken(); if(!t)return;
        var policy={
            ua_first:bool(getStorage(QUALITY_UA_KEY,true)),
            min_quality:parseInt(getStorage(QUALITY_MIN_KEY,720),10)||0,
            hide_cam:bool(getStorage(QUALITY_CAM_KEY,true)),
            only_working:bool(getStorage(QUALITY_WORKING_KEY,true)),
            kids_mode:bool(getStorage(KIDS_MODE_KEY,false)),
            iptv_preset:getStorage(IPTV_PRESET_KEY,'ua'),
            update_channel:getStorage(UPDATE_CHANNEL_KEY,'stable')
        };
        ajax('POST',k2Api('/k2/policy'),{token:t,policy:policy},function(){if(!quiet)notify('✓ Правила K2 збережено');},function(){if(!quiet)notify('✕ Не вдалося зберегти правила');});
    }

    function checkProviderHealth() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи K2 Lampac.');
        notify('Перевіряю балансери Lampac…');
        ajax('POST',k2Api('/k2/provider-health'),{token:t,force:true},function(r){
            var a=r.providers||[], h='<b>Балансери: '+(r.working||0)+'/'+(r.total||0)+'</b><br><br>';
            for(var i=0;i<a.length;i++){
                h+=(a[i].work?'✓ ':'✕ ')+String(a[i].name||'?')+(a[i].quality?' · '+a[i].quality+'p':'')+'<br>';
            }
            showHtmlModal('Lampac — якість джерел',h||'Немає даних');
        },function(){notify('✕ Не вдалося перевірити балансери');});
    }

    function checkSystemHealth() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи K2 Lampac.');
        ajax('GET',k2Api('/k2/system-health?token='+encodeURIComponent(t)),null,function(r){
            var x=r.runtime||{}, tv=r.tv||{}, p=r.providers||{};
            var h='<b>Y7 SYSTEM</b><br><br>'+ 
                'Gateway: ✓<br>'+ 'Lampac: '+(r.lampac&&r.lampac.ok?'✓':'✕')+(r.lampac&&r.lampac.ms?' · '+r.lampac.ms+' ms':'')+'<br>'+ 
                'Chromium: '+(r.chromium&&r.chromium.ok?'✓':'✕')+'<br>'+ 
                'Lampac providers: '+(p.ok===false?'✕':((p.working||'?')+'/'+(p.total||'?')))+'<br>'+ 
                'TorrServer LG: '+(tv.torrserver?'✓':'?')+'<br>'+ 
                'Uptime: '+Math.floor((x.uptime||0)/3600)+' год<br>'+ 
                'Restarts: Lampac '+((x.restarts||{}).lampac||0)+', Gateway '+((x.restarts||{}).gateway||0)+', bridge '+((x.restarts||{}).bridge||0);
            showHtmlModal('Y7 Health',h);
        },function(){notify('✕ K2 System Health недоступний');});
    }

    function startRemoteAdmin() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи K2 Lampac.');
        ajax('POST',k2Api('/k2/admin/start'),{token:t},function(r){
            if(!r.url)return notify('Не отримано URL керування');
            REMOTE_ADMIN_UNTIL = Date.now() + 31*60*1000;
            var box=$('<div style="padding:1em;text-align:center"><div class="k2-admin-qr" style="width:220px;height:220px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div><div>Скануй QR телефоном і введи Admin PIN.</div><div style="opacity:.65;font-size:.8em;margin-top:1em;overflow-wrap:anywhere">'+r.url+'</div></div>');
            Lampa.Modal.open({title:'Y7 Admin',html:box,size:'medium',onBack:function(){Lampa.Modal.close();}});
            loadQrLib(function(ok){if(ok){try{new QRCode(box.find('.k2-admin-qr')[0],{text:r.url,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});}catch(e){}}});
        },function(){notify('✕ Не вдалося відкрити K2 Admin');});
    }


    function startGuestRemote() {
        var t=clientToken(); if(!t)return notify('Спочатку підключи Y7 Core.');
        ajax('POST',k2Api('/k2/remote/start'),{token:t},function(r){
            if(!r.url)return notify('Не отримано URL Y7 TV Manager');
            REMOTE_GUEST_UNTIL=Date.now()+((r.expires_in||43200)*1000);
            ensureGuestRemotePoll();
            var hours=Math.max(1,Math.ceil((r.expires_in||43200)/3600));
            var box=$('<div style="padding:1em;text-align:center"><div class="y7-remote-qr" style="width:220px;height:220px;margin:0 auto 1em;background:#fff;padding:8px;box-sizing:content-box"></div><div style="font-size:1.05em;font-weight:700">Y7 TV Manager · '+hours+' год</div><div style="margin-top:.55em">Сканує будь-хто — PIN не потрібен. Повне налаштування Y7 Media тільки цього TV.</div><div style="opacity:.65;font-size:.8em;margin-top:1em;overflow-wrap:anywhere">'+r.url+'</div></div>');
            Lampa.Modal.open({title:'Y7 TV Manager',html:box,size:'medium',onBack:function(){Lampa.Modal.close();}});
            loadQrLib(function(ok){if(ok){try{new QRCode(box.find('.y7-remote-qr')[0],{text:r.url,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});}catch(e){}}});
        },function(){notify('Не вдалося створити Y7 TV Manager QR');});
    }

    function stopGuestRemote() {
        var t=clientToken(); if(!t)return;
        ajax('POST',k2Api('/k2/remote/revoke'),{token:t},function(){REMOTE_GUEST_UNTIL=0;notify('Y7 TV Manager для цього TV закрито');},function(){notify('Не вдалося закрити Y7 TV Manager');});
    }

    function remoteControllerAction(name) {
        try {
            if(name==='y7'){openK2FullManager();return true;}
            if(name==='menu'){if(Lampa.Controller&&Lampa.Controller.toggle){Lampa.Controller.toggle('menu');return true;}}
            if(name==='home'){
                try{Lampa.Activity.push({url:'',title:'',component:'main',page:1});return true;}catch(eh){}
            }
            var c=Lampa.Controller&&Lampa.Controller.enabled?Lampa.Controller.enabled():null;
            if(c&&typeof c[name]==='function'){c[name]();return true;}
            if(name==='back'&&Lampa.Activity&&Lampa.Activity.backward){Lampa.Activity.backward();return true;}
        } catch(e) {}
        return false;
    }

    function remoteTextInput(text) {
        text=String(text||'').slice(0,300);
        try {
            var el=document.activeElement;
            if(el&&(/^(INPUT|TEXTAREA)$/i).test(el.tagName)){
                el.value=text;
                try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e1){}
                try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e2){}
                return true;
            }
        } catch(e) {}
        notify('Відкрий поле вводу на TV і повтори');
        return false;
    }

    function executeGuestCommand(c){
        if(!c||!c.type)return;
        if(c.type==='remote_key')remoteControllerAction(String(c.key||''));
        else if(c.type==='remote_text')remoteTextInput(c.text||'');
        else executeCommand(c);
    }

    function ensureGuestRemotePoll(){
        if(REMOTE_GUEST_POLLING||Date.now()>REMOTE_GUEST_UNTIL)return;
        var t=clientToken();if(!t)return;
        REMOTE_GUEST_POLLING=true;
        try{
            var x=new XMLHttpRequest();
            x.open('POST',k2Api('/k2/remote/poll'),true);
            x.timeout=26000;
            x.setRequestHeader('Content-Type','application/json');
            x.onload=function(){
                REMOTE_GUEST_POLLING=false;
                var r={};try{r=JSON.parse(x.responseText||'{}');}catch(e){}
                if(x.status>=200&&x.status<300&&r.ok){
                    var cs=r.commands||[];for(var i=0;i<cs.length;i++)executeGuestCommand(cs[i]);
                    if(r.active){REMOTE_GUEST_UNTIL=Date.now()+Math.max(1000,(r.expires_in||30)*1000);setTimeout(ensureGuestRemotePoll,25);}
                    else REMOTE_GUEST_UNTIL=0;
                } else if(Date.now()<REMOTE_GUEST_UNTIL) setTimeout(ensureGuestRemotePoll,1200);
            };
            x.onerror=function(){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,1600);};
            x.ontimeout=function(){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,30);};
            x.send(JSON.stringify({token:t,wait:20}));
        }catch(e){REMOTE_GUEST_POLLING=false;if(Date.now()<REMOTE_GUEST_UNTIL)setTimeout(ensureGuestRemotePoll,1600);}
    }

    function backupSnapshot() {
        var toggles={}, a=PLUGINS;
        for(var i=0;i<a.length;i++)toggles[a[i].id]=enabled(a[i]);
        return {version:VERSION,toggles:toggles,extras:extraPlugins(),settings:{
            start_page:getStorage(START_PAGE_KEY,'favorite@history'),iptv:getStorage(IPTV_PRESET_KEY,'ua'),
            kids:bool(getStorage(KIDS_MODE_KEY,false)),sync:bool(getStorage(SYNC_ON_KEY,true)),
            quality_min:getStorage(QUALITY_MIN_KEY,720),quality_ua:bool(getStorage(QUALITY_UA_KEY,true)),
            quality_cam:bool(getStorage(QUALITY_CAM_KEY,true)),quality_working:bool(getStorage(QUALITY_WORKING_KEY,true)),
            glass:getStorage('glass_style',false),black:getStorage('black_style',false),animation:getStorage('animation',true),background:getStorage('background',true)
        }};
    }
    function saveBackup(quiet){var t=clientToken();if(!t)return;if(!quiet)notify('Створюю backup…');ajax('POST',k2Api('/k2/backup/save'),{token:t,snapshot:backupSnapshot()},function(){if(!quiet)notify('✓ Backup Y7 створено');},function(){if(!quiet)notify('✕ Backup не створено');});}
    function restoreBackup(){var t=clientToken();if(!t)return;ajax('GET',k2Api('/k2/backup/latest?token='+encodeURIComponent(t)),null,function(r){var b=r.snapshot||{},tog=b.toggles||{},st=b.settings||{};PLUGINS.forEach(function(p){if(typeof tog[p.id]!=='undefined')setEnabled(p,!!tog[p.id]);});if(b.extras)saveExtraPlugins(b.extras);if(st.start_page)setStartPage(st.start_page,true);if(st.iptv)applyIptvPreset(st.iptv,true);if(typeof st.kids!=='undefined')setStorage(KIDS_MODE_KEY,!!st.kids);enforceKidsRestrictions();if(typeof st.sync!=='undefined')setStorage(SYNC_ON_KEY,!!st.sync);if(st.quality_min!==undefined)setStorage(QUALITY_MIN_KEY,st.quality_min);if(st.quality_ua!==undefined)setStorage(QUALITY_UA_KEY,!!st.quality_ua);if(st.quality_cam!==undefined)setStorage(QUALITY_CAM_KEY,!!st.quality_cam);if(st.quality_working!==undefined)setStorage(QUALITY_WORKING_KEY,!!st.quality_working);reconcile(true);sendPolicy(true);notify('✓ Backup відновлено. Перезапусти Lampa.');},function(){notify('✕ Немає backup або сервер недоступний');});}

    function sha256Hex(text, done, fail){
        try{if(!window.crypto||!crypto.subtle)return fail&&fail();var data=new TextEncoder().encode(text);crypto.subtle.digest('SHA-256',data).then(function(buf){var a=new Uint8Array(buf),s='';for(var i=0;i<a.length;i++)s+=('0'+a[i].toString(16)).slice(-2);done(s);}).catch(function(){fail&&fail();});}catch(e){fail&&fail();}
    }
    function checkClientUpdate(manual, channel){
        var t=clientToken();if(!t)return;channel=channel||getStorage(UPDATE_CHANNEL_KEY,'stable');
        ajax('GET',k2Api('/k2/client-manifest?channel='+encodeURIComponent(channel)+'&token='+encodeURIComponent(t)),null,function(m){
            if(!m.ok)return;if(!versionNewer(m.version,VERSION)){if(manual)notify('✓ K2 '+VERSION+' — актуальна версія');return;}
            var x=new XMLHttpRequest();x.open('GET',m.url+'?token='+encodeURIComponent(t),true);x.timeout=20000;x.onload=function(){if(x.status<200||x.status>=300)return notify('✕ Не вдалося завантажити оновлення');var code=x.responseText||'';sha256Hex(code,function(hex){if(hex.toLowerCase()!==String(m.sha256).toLowerCase())return notify('✕ SHA-256 оновлення не збігається');try{localStorage.setItem('k2_client_cache_version',m.version);localStorage.setItem('k2_client_cache_code',code);notify('✓ K2 '+m.version+' перевірено. Перезапусти Lampa.');}catch(e){notify('✕ Не вдалося зберегти оновлення');}},function(){notify('✕ WebCrypto недоступний — автооновлення не застосовано');});};x.send();
        },function(){if(manual)notify('✕ Сервер оновлень недоступний');});
    }
    function versionNewer(a,b){function v(x){var z=String(x||'').match(/\d+/g)||[];return [+(z[0]||0),+(z[1]||0),+(z[2]||0),+(z[3]||0)];}a=v(a);b=v(b);for(var i=0;i<4;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}

    function discoverPlugins(){var t=clientToken();if(!t)return;notify('Шукаю нові розширення…');ajax('POST',k2Api('/k2/discover'),{token:t},function(r){var a=r.candidates||[],h='<b>Карантин: '+a.length+' кандидатів</b><br><small>Нічого не встановлюється автоматично. Перевір/схвали через K2 Admin з телефона.</small><br><br>';for(var i=0;i<Math.min(18,a.length);i++)h+='• '+String(a[i].name||a[i].url)+'<br>';showHtmlModal('Нові плагіни',h);},function(){notify('✕ Каталог недоступний');});}

    function enforceKidsRestrictions(){
        if(!bool(getStorage(KIDS_MODE_KEY,false)))return;
        setStorage(SISI_ON_KEY,false);
        PLUGINS.forEach(function(p){if(p.cat==='adult')setEnabled(p,false);});
    }

    function applyKidsMode(on, fromAdmin){
        var current=bool(getStorage(KIDS_MODE_KEY,false));
        if(!on && current && !fromAdmin){setStorage(KIDS_MODE_KEY,true);notify('🔒 Вимкнення дитячого режиму — тільки через K2 Admin + PIN.');startRemoteAdmin();return;}
        setStorage(KIDS_MODE_KEY,!!on);
        if(on){enforceKidsRestrictions();applyIptvPreset('kids_ua',true);syncSecureLampac(false);reconcile(false);notify('Дитячий режим увімкнено');}
        else{notify('✓ Дитячий режим вимкнено через Admin PIN');}
        sendPolicy(true);
        if(currentSettingsBody)decorate(currentSettingsBody);
    }

    function executeCommand(c){
        if(!c||!c.type)return;
        if(c.type==='kids')applyKidsMode(!!c.on,true);
        else if(c.type==='iptv')applyIptvPreset(c.preset||'ua',false);
        else if(c.type==='policy'){
            var p=c.policy||{};
            if(p.min_quality!==undefined)setStorage(QUALITY_MIN_KEY,p.min_quality);
            if(p.ua_first!==undefined)setStorage(QUALITY_UA_KEY,!!p.ua_first);
            if(p.hide_cam!==undefined)setStorage(QUALITY_CAM_KEY,!!p.hide_cam);
            if(p.only_working!==undefined)setStorage(QUALITY_WORKING_KEY,!!p.only_working);
            sendPolicy(true);
        }
        else if(c.type==='plugin'){var p=pluginById(c.id);if(p)toggle(p,!!c.on);}
        else if(c.type==='lampac'){
            if(c.online!==undefined)setStorage(LAMPAC_ON_KEY,!!c.online);
            if(c.sisi!==undefined)setStorage(SISI_ON_KEY,!!c.sisi);
            if(bool(getStorage(KIDS_MODE_KEY,false)))setStorage(SISI_ON_KEY,false);
            syncSecureLampac(true);needRestart(true);
        }
        else if(c.type==='start_page')setStartPage(c.value||'favorite@history',false);
        else if(c.type==='sync'){setStorage(SYNC_ON_KEY,!!c.on);syncSecureLampac(true);needRestart(true);}
        else if(c.type==='health_auto')setStorage(HEALTH_AUTO_KEY,!!c.on);
        else if(c.type==='style'){
            if(c.preset==='glass')applyGlassPreset(false);
            else if(c.preset==='oled')applyOledPreset();
            else applyStandardLook();
        }
        else if(c.type==='torr_url')setTorrServer(c.url||'http://127.0.0.1:8090');
        else if(c.type==='check_plugins')checkAllPlugins(true);
        else if(c.type==='check_torr')checkTorrServer();
        else if(c.type==='provider_check')checkProviderHealth();
        else if(c.type==='backup')saveBackup(true);
        else if(c.type==='restore')restoreBackup();
        else if(c.type==='update'){setStorage(UPDATE_CHANNEL_KEY,c.channel||'stable');checkClientUpdate(true,c.channel||'stable');}
        else if(c.type==='update_channel')setStorage(UPDATE_CHANNEL_KEY,c.channel||'stable');
        else if(c.type==='extra_add'){if(addExtraPlugin(c.plugin||{}))notify('✓ Новий плагін додано з карантину');}
        else if(c.type==='remote_key')remoteControllerAction(String(c.key||''));
        else if(c.type==='remote_text')remoteTextInput(c.text||'');
        setTimeout(heartbeat,250);
    }
    function heartbeat(){
        var t=clientToken();if(!t)return;
        var ph=healthCache(),summary=ph&&ph.summary?ph.summary:{},hm=healthMap(),plist=[];
        PLUGINS.forEach(function(p){var h=hm[p.id]||{};plist.push({id:p.id,name:p.name,cat:p.cat,on:enabled(p),health:h.state||'',http:h.http||0});});
        var settings={
            start_page:getStorage(START_PAGE_KEY,'favorite@history'),sync:bool(getStorage(SYNC_ON_KEY,true)),
            health_auto:bool(getStorage(HEALTH_AUTO_KEY,true)),torr_url:getStorage('k2pm_ts_url','http://127.0.0.1:8090'),
            lampac_online:bool(getStorage(LAMPAC_ON_KEY,true)),sisi:bool(getStorage(SISI_ON_KEY,false)),
            glass:bool(getStorage('glass_style',false)),black:bool(getStorage('black_style',false)),
            animation:bool(getStorage('animation',true)),background:bool(getStorage('background',true))
        };
        ajax('POST',k2Api('/k2/heartbeat'),{
            token:t,version:VERSION,torrserver:bool(getStorage(TORR_LAST_KEY,false)),plugin_summary:summary,
            iptv_preset:getStorage(IPTV_PRESET_KEY,'ua'),kids_mode:bool(getStorage(KIDS_MODE_KEY,false)),
            update_channel:getStorage(UPDATE_CHANNEL_KEY,'stable'),plugins:plist,settings:settings
        },function(r){
            var cs=r.commands||[];for(var i=0;i<cs.length;i++)executeCommand(cs[i]);
            if(r.remote_active){REMOTE_GUEST_UNTIL=Date.now()+Math.max(1000,(r.remote_expires_in||30)*1000);ensureGuestRemotePoll();}
        },function(){});
    }

    function pollAdminCommands(){
        if(Date.now()>REMOTE_ADMIN_UNTIL)return;
        var t=clientToken();if(!t)return;
        ajax('POST',k2Api('/k2/commands'),{token:t},function(r){
            var cs=r.commands||[];
            if(!cs.length)return;
            for(var i=0;i<cs.length;i++)executeCommand(cs[i]);
            // Send the changed state back immediately instead of waiting for the 30 s heartbeat.
            setTimeout(heartbeat,250);
        },function(){});
    }

    function healthCache() {
        try {
            var c = Lampa.Storage.get(HEALTH_CACHE_KEY, null);
            return c && typeof c === 'object' ? c : null;
        } catch (e) { return null; }
    }

    function setHealthCache(c) {
        try { Lampa.Storage.set(HEALTH_CACHE_KEY, c || null); } catch (e) {}
        applyHealthSuppression(c);
    }
    function applyHealthSuppression(c){
        if(!c||!c.results)return;
        var counts=getStorage(HEALTH_FAIL_KEY,{}),sup=getStorage(HEALTH_SUPPRESS_KEY,{}),changed=false;
        for(var i=0;i<c.results.length;i++){
            var r=c.results[i],p=pluginById(r.id); if(!p)continue;
            if(r.state==='dead')counts[r.id]=(counts[r.id]||0)+1;else counts[r.id]=0;
            if(counts[r.id]>=4 && enabled(p)){if(!sup[r.id]){sup[r.id]=true;if(remove(p.url))changed=true;}}
            if(r.state==='ok' && sup[r.id]){delete sup[r.id];if(enabled(p)&&add(p.url,p)){changed=true;load([p.url]);}}
        }
        setStorage(HEALTH_FAIL_KEY,counts);setStorage(HEALTH_SUPPRESS_KEY,sup);if(changed)save();
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
            list.push({id:'__lampac_sync',name:'K2 Sync',url:secureSyncUrl()});
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
        var sup=getStorage(HEALTH_SUPPRESS_KEY,{}); if(result&&sup[result.id])s={cls:'dead',text:'⏸ авто-пауза: джерело мертве'};
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
        healthRow(body, SYNC_ON_KEY, map.__lampac_sync);

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
            x.onload=function(){var ok=x.status>=200&&x.status<500;setStorage(TORR_LAST_KEY,ok);notify(ok?'✓ TorrServer доступний':'✕ TorrServer HTTP '+x.status);};
            x.onerror=function(){setStorage(TORR_LAST_KEY,false);notify('✕ TorrServer не відповідає');};
            x.ontimeout=x.onerror;
            x.send();
        } catch(e){notify('✕ Не вдалося перевірити TorrServer');}
    }

    function addParam(o) {
        try { Lampa.SettingsApi.addParam(o); } catch(e){ log('param error',e); }
    }


    function k2Svg(name) {
        var p='';
        if(name==='server')p='<path d="M5 5h14v5H5zM5 14h14v5H5z"/><circle cx="8" cy="7.5" r="1" fill="currentColor"/><circle cx="8" cy="16.5" r="1" fill="currentColor"/>';
        else if(name==='health')p='<path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='tv')p='<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='kids')p='<circle cx="12" cy="8" r="4"/><path d="M5 21c.8-5 3-7 7-7s6.2 2 7 7" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='quality')p='<path d="M4 17l4-4 3 3 6-7 3 3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='backup')p='<path d="M5 3h11l3 3v15H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3v6h8V3M8 21v-7h8v7" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='home')p='<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='film')p='<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 5v14M16 5v14M3 9h5M16 9h5M3 15h5M16 15h5" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        else if(name==='torrent')p='<path d="M12 3v12M7 10l5 5 5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='lock')p='<rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/>';
        else if(name==='collection')p='<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>';
        else if(name==='design')p='<path d="M12 3a9 9 0 100 18c2 0 2-3 4-3h2a3 3 0 000-6h-1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="9" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="7" cy="13" r="1"/>';
        else p='<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/>';
        return '<svg class="k2f-icon" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
    }

    function openK2FullManager() {
        if(FULL_OPENING)return;
        FULL_OPENING=true;
        try{
            Lampa.Activity.push({url:'',title:'Y7 Media',component:FULL_COMPONENT,page:1});
        }catch(e){
            FULL_OPENING=false;
            notify('Не вдалося відкрити Y7 Media');
        }
        setTimeout(function(){FULL_OPENING=false;},700);
    }

    function registerFullManager() {
        try{
            Lampa.Component.add(FULL_COMPONENT,function(object){
                var self=this;
                var scroll=new Lampa.Scroll({mask:true,over:true});
                var root=$('<div class="k2f-root"></div>');
                var body=$('<div class="k2f-body"></div>');
                var last=false;

                function statusText(r){
                    if(!r)return 'не перевірено';
                    if(r.state==='ok')return 'доступний'+(r.ms?' · '+r.ms+' ms':'');
                    if(r.state==='warn')return 'відповідає'+(r.http?' · HTTP '+r.http:'');
                    if(r.state==='blocked')return 'перевірку обмежено';
                    return 'недоступний'+(r.http?' · HTTP '+r.http:'');
                }
                function section(title,icon){
                    body.append('<div class="k2f-section">'+k2Svg(icon)+'<span>'+title+'</span></div>');
                }
                function row(title,desc,value,action,cls){
                    var r=$('<div class="k2f-row selector '+(cls||'')+'"><div class="k2f-row-main"><div class="k2f-row-title"></div><div class="k2f-row-desc"></div></div><div class="k2f-value"></div></div>');
                    r.find('.k2f-row-title').text(title);
                    r.find('.k2f-row-desc').text(desc||'');
                    r.find('.k2f-value').text(value||'');
                    r.on('hover:focus',function(){last=r[0];try{scroll.update(r,true);}catch(e){}});
                    r.on('hover:enter',function(){if(action)action(r);});
                    body.append(r);return r;
                }
                function toggleRow(title,desc,getter,setter){
                    var r=row(title,desc,getter()?'ON':'OFF',function(x){var nv=!getter();setter(nv);x.find('.k2f-value').text(nv?'ON':'OFF');x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',getter());return r;
                }
                function selectRow(title,desc,values,current,setter){
                    return row(title,desc,values[current]||String(current),function(x){
                        var items=[];Object.keys(values).forEach(function(k){items.push({title:values[k],value:k,selected:String(k)===String(current)});});
                        Lampa.Select.show({title:title,items:items,onBack:function(){Lampa.Controller.toggle('k2full');},onSelect:function(a){current=a.value;setter(a.value);x.find('.k2f-value').text(values[a.value]||a.value);Lampa.Select.close();Lampa.Controller.toggle('k2full');}});
                    });
                }
                function pluginRow(p){
                    var hm=healthMap(), hr=hm[p.id];
                    var val=(enabled(p)?'ON':'OFF')+' · '+statusText(hr);
                    var r=row(p.name,p.desc,val,function(x){var nv=!enabled(p);toggle(p,nv);x.find('.k2f-value').text((nv?'ON':'OFF')+' · '+statusText(healthMap()[p.id]));x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',enabled(p));return r;
                }
                function dynToggle(title,desc,key,def,onChange,healthId){
                    function get(){return bool(getStorage(key,def));}
                    var hr=healthId?healthMap()[healthId]:null;
                    var r=row(title,desc,(get()?'ON':'OFF')+(healthId?' · '+statusText(hr):''),function(x){var nv=!get();setStorage(key,nv);onChange(nv);x.find('.k2f-value').text((nv?'ON':'OFF')+(healthId?' · '+statusText(healthMap()[healthId]):''));x.toggleClass('k2f-on',nv);});
                    r.toggleClass('k2f-on',get());return r;
                }

                function build(){
                    body.empty();
                    var paired=!!clientToken();
                    var kids=bool(getStorage(KIDS_MODE_KEY,false));
                    var health=healthCache()||{}, hs=health.summary||{};
                    var healthy=(hs.ok||0)+(hs.warn||0);
                    var total=healthy+(hs.dead||0)+(hs.blocked||0);

                    body.append(
                        '<div class="k2f-head">'+
                        '<div class="k2f-logo">Y7</div>'+
                        '<div class="k2f-headtext"><div class="k2f-title">Y7 Media</div>'+
                        '<div class="k2f-sub">v'+VERSION+' · Core '+(paired?'online':'offline')+
                        ' · '+countEnabled()+' активних'+(kids?' · Y7 Kids ON':'')+'</div></div>'+
                        '<div class="k2f-summary">Sources <b>'+healthy+'/'+total+'</b></div>'+
                        '</div>'
                    );

                    section('Швидкий доступ','home');
                    row(
                        paired?'Y7 Core підключено':'Підключити Y7 Core',
                        paired?'Захищене з’єднання з Media Server активне.':'QR + Y7 Admin PIN. Довгий token вручну не вводиться.',
                        paired?'ONLINE':'PAIR',
                        function(){if(paired)checkSecureLampac();else startPairing();},
                        paired?'k2f-on':''
                    );
                    row('Y7 Admin','Керування TV з телефона: плагіни, IPTV, Kids, backup та update.','OPEN',startRemoteAdmin);
                    row('Y7 TV Manager','QR без PIN: повне налаштування Y7 Media тільки цього TV. Новий QR відкликає попередній.','QR',startGuestRemote);
                    row('Закрити Y7 TV Manager','Одразу закрити доступ Y7 TV Manager до цього TV.','REVOKE',stopGuestRemote);
                    row('Y7 Health','Core, Chromium, джерела, TorrServer, IPTV та autorecovery.','CHECK',checkSystemHealth);
                    row('TorrServer','Локальний TorrServer цього LG: '+String(getStorage('k2pm_ts_url','http://127.0.0.1:8090')),'CHECK',checkTorrServer);

                    section('Перегляд і якість','quality');
                    dynToggle('Lampac Online','Основні онлайн-джерела через Y7 Core.',LAMPAC_ON_KEY,true,function(){syncSecureLampac(true);needRestart(true);},'__lampac_online');
                    row('Перевірити балансери','Робочі джерела та визначена якість 4K / 1080p / 720p.','CHECK',checkProviderHealth);
                    selectRow('Мінімальна відома якість','Невідому якість Y7 не відкидає.',{0:'Будь-яка',720:'720p+',1080:'1080p+',2160:'4K, якщо визначено'},String(getStorage(QUALITY_MIN_KEY,720)),function(v){setStorage(QUALITY_MIN_KEY,parseInt(v,10)||0);sendPolicy(false);});
                    toggleRow('Українська — вище','UA-позначені варіанти отримують додатковий пріоритет.',function(){return bool(getStorage(QUALITY_UA_KEY,true));},function(v){setStorage(QUALITY_UA_KEY,v);sendPolicy(false);});
                    toggleRow('Ховати CAM / TS','Прибирає очевидно низькоякісні джерела.',function(){return bool(getStorage(QUALITY_CAM_KEY,true));},function(v){setStorage(QUALITY_CAM_KEY,v);sendPolicy(false);});
                    toggleRow('Тільки робочі','Після health-check мертві балансери не показуються.',function(){return bool(getStorage(QUALITY_WORKING_KEY,true));},function(v){setStorage(QUALITY_WORKING_KEY,v);sendPolicy(false);});

                    section('IPTV, футбол і діти','tv');
                    var iv={};Object.keys(IPTV_PRESETS).forEach(function(k){iv[k]=IPTV_PRESETS[k].title;});
                    selectRow('IPTV пресет','Україна, футбол, спорт, Kids, Animation та інші списки.',iv,String(getStorage(IPTV_PRESET_KEY,'ua')),function(v){applyIptvPreset(v,false);});
                    row('Футбол','Швидко ввімкнути football-пресет.','APPLY',function(){applyIptvPreset('football',false);});
                    toggleRow('Y7 Kids','Kids UA + блокування 18+. Вимкнення захищене Y7 Admin PIN.',function(){return bool(getStorage(KIDS_MODE_KEY,false));},function(v){applyKidsMode(v,false);});
                    PLUGINS.forEach(function(p){if(p.cat==='kids')pluginRow(p);});

                    section('Онлайн-джерела','film');
                    PLUGINS.forEach(function(p){if(p.cat==='online')pluginRow(p);});

                    section('Торренти','torrent');
                    PLUGINS.forEach(function(p){if(p.cat==='torrent')pluginRow(p);});

                    section('Колекції та каталоги','collection');
                    PLUGINS.forEach(function(p){if(p.cat==='collections')pluginRow(p);});

                    section('TV і спорт','tv');
                    PLUGINS.forEach(function(p){if(p.cat==='tv')pluginRow(p);});

                    section('Вигляд','design');
                    row('Y7 Glass','Штатний glass-стиль Lampa без перебудови картки фільму.','APPLY',function(){applyGlassPreset(false);});
                    row('Y7 OLED Black','Темний варіант для OLED / темної кімнати.','APPLY',applyOledPreset);
                    row('Стандартна Lampa','Повернути штатний вигляд без Y7 preset.','APPLY',applyStandardLook);
                    PLUGINS.forEach(function(p){if(p.cat==='design')pluginRow(p);});

                    section('Система і обслуговування','backup');
                    selectRow('Стартова сторінка','Звичайна штатна стартова сторінка Lampa.',{'favorite@history':'Історія переглядів','main':'Головна','favorite@bookmarks':'Закладки','mytorrents':'Мої торренти','last':'Останній екран'},String(getStorage(START_PAGE_KEY,'favorite@history')),function(v){setStartPage(v,false);});
                    toggleRow('Y7 Sync','Спільні закладки та позиція перегляду між прив’язаними TV.',function(){return bool(getStorage(SYNC_ON_KEY,true));},function(v){setStorage(SYNC_ON_KEY,v);syncSecureLampac(true);needRestart(true);});
                    row('Перевірити всі плагіни','Оновити статус кожного джерела.','CHECK',function(){checkAllPlugins(true);});
                    toggleRow('Автоперевірка плагінів','Health-кеш приблизно раз на 6 годин.',function(){return bool(getStorage(HEALTH_AUTO_KEY,true));},function(v){setStorage(HEALTH_AUTO_KEY,v);});
                    row('Створити backup','Налаштування, плагіни, IPTV, Kids і вигляд — без секретів.','RUN',function(){saveBackup(false);});
                    row('Відновити backup','Відновити останній backup Y7.','RUN',restoreBackup);
                    selectRow('Канал оновлень','Stable або Beta.',{stable:'Stable',beta:'Beta'},String(getStorage(UPDATE_CHANNEL_KEY,'stable')),function(v){setStorage(UPDATE_CHANNEL_KEY,v);});
                    row('Перевірити оновлення','Застосування тільки після SHA-256 перевірки.','CHECK',function(){checkClientUpdate(true);});
                    row('Пошук нових плагінів','Нові URL потрапляють тільки в карантин.','SCAN',discoverPlugins);

                    section('Корисне','health');
                    PLUGINS.forEach(function(p){if(p.cat==='utils')pluginRow(p);});

                    if(!kids){
                        section('18+','lock');
                        dynToggle('SISI','18+ джерела через Y7 Core.',SISI_ON_KEY,false,function(){syncSecureLampac(true);needRestart(true);},'__lampac_sisi');
                        PLUGINS.forEach(function(p){if(p.cat==='adult')pluginRow(p);});
                    }
                }

                this.create=function(){
                    style();
                    build();
                    scroll.append(body);root.append(scroll.render());
                    try{this.activity.loader(false);}catch(e){}
                    return this.render();
                };
                this.render=function(){return root;};
                this.start=function(){
                    if(Lampa.Activity.active().activity!==this.activity)return;
                    Lampa.Controller.add('k2full',{
                        toggle:function(){Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(last||root.find('.selector')[0],root);},
                        up:function(){Navigator.move('up');},down:function(){Navigator.move('down');},
                        left:function(){if(Navigator.canmove('left'))Navigator.move('left');else Lampa.Controller.toggle('menu');},
                        right:function(){Navigator.move('right');},back:self.back.bind(self)
                    });
                    Lampa.Controller.toggle('k2full');
                };
                this.back=function(){Lampa.Activity.backward();};
                this.pause=function(){};this.stop=function(){};
                this.destroy=function(){try{scroll.destroy();}catch(e){}root.remove();body.remove();};
            });
        }catch(e){log('full manager register error',e);}
    }

    function setupSettings() {
        try {
            Lampa.SettingsApi.addComponent({component:COMPONENT,name:'Y7 Media',icon:ICON});
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
            field:{name:'Перевірити всі плагіни',description:'Перевірка кожного джерела через K2 сервер. Статус з’явиться прямо під кожним плагіном.'},
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

        addParam({component:COMPONENT,param:{name:'k2pm_system_health',type:'trigger',default:false},field:{name:'Y7 Health',description:'Lampac, Chromium, балансери, TorrServer TV, uptime та autorecovery.'},onChange:function(){setStorage('k2pm_system_health',false);checkSystemHealth();}});
        addParam({component:COMPONENT,param:{name:'k2pm_provider_health',type:'trigger',default:false},field:{name:'Перевірити балансери Lampac',description:'Реальний пошук тестового фільму: робота джерела + визначена якість 4K/1080/720.'},onChange:function(){setStorage('k2pm_provider_health',false);checkProviderHealth();}});
        addParam({component:COMPONENT,param:{name:'k2pm_remote_admin',type:'trigger',default:false},field:{name:'Y7 Admin на телефоні',description:'QR → Admin PIN → здоров’я, Kids, IPTV, якість, плагіни, backup та updates.'},onChange:function(){setStorage('k2pm_remote_admin',false);startRemoteAdmin();}});

        addParam({component:COMPONENT,param:{name:KIDS_MODE_KEY,type:'trigger',default:false},field:{name:'Дитячий режим',description:'Приховує/вимикає 18+ та ставить український дитячий IPTV. Вимкнення — тільки через телефон + Admin PIN.'},onChange:function(v){applyKidsMode(bool(v),false);}});

        addParam({component:COMPONENT,param:{name:SYNC_ON_KEY,type:'trigger',default:true},field:{name:'Y7 Sync',description:'Спільні закладки/історія/позиція перегляду між усіма прив’язаними TV без профілів.'},onChange:function(){syncSecureLampac(true);needRestart(true);}});

        addParam({component:COMPONENT,param:{name:QUALITY_MIN_KEY,type:'select',values:{0:'Будь-яка',720:'720p+',1080:'1080p+',2160:'4K, якщо визначено'},default:720},field:{name:'Мінімальна відома якість Lampac',description:'Невідому якість не відкидає; відомі низькі якості опускає/ховає.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_UA_KEY,type:'trigger',default:true},field:{name:'Українська — вище',description:'Українські/UA позначені джерела отримують додатковий пріоритет.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_CAM_KEY,type:'trigger',default:true},field:{name:'Ховати CAM / TS',description:'Не показувати очевидно низькоякісні CAM/TS/TC варіанти.'},onChange:function(){sendPolicy(false);}});
        addParam({component:COMPONENT,param:{name:QUALITY_WORKING_KEY,type:'trigger',default:true},field:{name:'Після перевірки — тільки робочі',description:'Коли Lampac завершив life-check, мертві балансери прибираються зі списку.'},onChange:function(){sendPolicy(false);}});

        addParam({component:COMPONENT,param:{name:'k2pm_backup_now',type:'trigger',default:false},field:{name:'Створити backup K2',description:'Зберігає без секретів налаштування, плагіни, IPTV, Kids та дизайн на сервері.'},onChange:function(){setStorage('k2pm_backup_now',false);saveBackup(false);}});
        addParam({component:COMPONENT,param:{name:'k2pm_restore_backup',type:'trigger',default:false},field:{name:'Відновити останній backup',description:'Відновити K2 налаштування. Pairing/token не переноситься.'},onChange:function(){setStorage('k2pm_restore_backup',false);restoreBackup();}});
        addParam({component:COMPONENT,param:{name:UPDATE_CHANNEL_KEY,type:'select',values:{stable:'Stable',beta:'Beta'},default:'stable'},field:{name:'Канал оновлень K2',description:'Оновлення завантажується з твого K2 сервера й застосовується тільки після SHA-256 перевірки.'}});
        addParam({component:COMPONENT,param:{name:'k2pm_update_check',type:'trigger',default:false},field:{name:'Перевірити оновлення K2',description:'Без зміни GitHub URL: перевірене оновлення активується після рестарту Lampa.'},onChange:function(){setStorage('k2pm_update_check',false);checkClientUpdate(true);}});
        addParam({component:COMPONENT,param:{name:'k2pm_discover',type:'trigger',default:false},field:{name:'Знайти нові плагіни',description:'Нові URL лише потрапляють у карантин; автоматично нічого не встановлюється.'},onChange:function(){setStorage('k2pm_discover',false);discoverPlugins();}});

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
                    ua:'Україна — публічні канали',
                    ukr:'Україномовні — весь світ',
                    football:'Футбол — публічні спортивні канали',
                    sports:'Спорт — світ',
                    kids_ua:'Дітям — українське',
                    kids_world:'🧒 Дітям — світ',
                    animation:'Мультфільми / анімація',
                    education:'📚 Освітні канали',
                    news:'Новини — світ',
                    movies:'Кіно — світ',
                    music:'Музика — світ',
                    world:'Усі категорії — світ'
                },
                default:'ua'
            },
            field:{name:'Готовий IPTV-плейлист',description:'Безкоштовні публічні списки. Окремі канали можуть змінюватися або бути геообмежені.'},
            onChange:function(v){applyIptvPreset(v,false);}
        });
        addParam({component:COMPONENT,param:{name:'k2pm_football_now',type:'trigger',default:false},field:{name:'⚽ Футбол — увімкнути пресет',description:'Публічні спортивні канали з football-фільтром; якість і дублікати чистить K2 сервер.'},onChange:function(){setStorage('k2pm_football_now',false);applyIptvPreset('football',false);}});
        addParam({component:COMPONENT,param:{name:'k2pm_kids_ua_now',type:'trigger',default:false},field:{name:'🧒 Українське дітям — пресет',description:'Українські дитячі/анімаційні/освітні канали з публічних джерел. Це не вмикає Kids Mode автоматично.'},onChange:function(){setStorage('k2pm_kids_ua_now',false);applyIptvPreset('kids_ua',false);}});

        // Built-in Lampa design presets. Safer than full card redesign plugins.
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_glass_preset',type:'trigger',default:false},
            field:{name:'✨ Y7 Glass',description:'Скло + фон + плавна анімація. Не перебудовує картку фільму.'},
            onChange:function(){setStorage('k2pm_glass_preset',false);applyGlassPreset(false);}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_oled_preset',type:'trigger',default:false},
            field:{name:'◼ Y7 OLED Black',description:'Темний режим для LG/OLED: чорний фон + затемнене скло.'},
            onChange:function(){setStorage('k2pm_oled_preset',false);applyOledPreset();}
        });
        addParam({
            component:COMPONENT,
            param:{name:'k2pm_standard_look',type:'trigger',default:false},
            field:{name:'↩ Стандартний вигляд Lampa',description:'Вимикає Y7 Glass/Black; зовнішні дизайн-плагіни лишаються під своїми перемикачами.'},
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
        PLUGINS.forEach(function(p){ if(p.cat==='kids') addPluginToggle(p); });
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
            field:{name:'Рекомендований набір Y7',description:'Якість-first: Lampac Smart Source + Sync + IPTV UA + футбол/діти + торренти + Y7 Glass + перевірені утиліти.'},
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
        s.innerHTML='.k2pm-head{padding:1em 1.1em;margin:.5em 0 1em;border-radius:.55em;background:rgba(255,255,255,.08);line-height:1.45}.k2pm-head b{font-size:1.15em}.k2pm-cat{padding:1.3em .55em .45em;opacity:.72;font-weight:700;font-size:1.02em}.k2pm-health{margin:.18em .8em .55em;opacity:.92;font-size:.82em;line-height:1.25}.k2pm-health-ok{color:#77d98c}.k2pm-health-warn{color:#f0c36b}.k2pm-health-dead{color:#ff7f7f}.k2pm-health-unknown{color:#9da3aa}.k2pm-health-summary{margin:.6em .8em 1em;padding:.65em .8em;border-radius:.45em;background:rgba(255,255,255,.055);font-size:.88em;line-height:1.35}.k2f-root{width:100%;height:100%;box-sizing:border-box}.k2f-body{padding:1.2em 2.2em 4em;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65em}.k2f-head{grid-column:1/-1;display:flex;align-items:center;gap:1em;padding:.7em 0 1em;border-bottom:1px solid rgba(255,255,255,.08)}.k2f-logo{display:grid;place-items:center;width:3.35em;height:3.35em;border-radius:1em;background:linear-gradient(145deg,rgba(74,112,255,.98),rgba(91,62,230,.98));font-weight:900;font-size:1.08em}.k2f-headtext{min-width:0;flex:1}.k2f-summary{margin-left:auto;opacity:.75;font-size:.82em;white-space:nowrap}.k2f-title{font-size:1.55em;font-weight:800}.k2f-sub{opacity:.65;margin-top:.25em}.k2f-section{grid-column:1/-1;display:flex;align-items:center;gap:.55em;margin-top:1.15em;padding:.7em .2em .45em;font-weight:800;font-size:1.08em;opacity:.92;border-bottom:1px solid rgba(255,255,255,.06)}.k2f-icon{width:1.45em;height:1.45em;fill:currentColor;flex:0 0 auto}.k2f-row{display:flex;align-items:center;gap:1em;min-height:4.8em;padding:.9em 1em;border-radius:.85em;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.045);box-sizing:border-box}.k2f-row.focus{background:rgba(65,105,245,.9)}.k2f-row-main{min-width:0;flex:1}.k2f-row-title{font-size:1.03em;font-weight:700}.k2f-row-desc{font-size:.78em;opacity:.58;margin-top:.25em;line-height:1.25}.k2f-value{font-size:.82em;opacity:.8;white-space:nowrap}.k2f-on .k2f-value{font-weight:800}@media(max-width:720px){.k2f-body{grid-template-columns:1fr;padding:1em}.k2f-section,.k2f-head{grid-column:1}}';
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
        body.prepend('<div class="k2pm-head"><b>Y7 Media v'+VERSION+'</b><br>'+
            'Y7 Core: '+(paired?'✓ підключено':'○ не підключено')+
            ' · Плагінів: '+countEnabled()+
            (restart?'<br>⚠ Після вимкнення потрібен повний перезапуск Lampa.':'<br>✓ Менеджер активний.')+
            '</div>');

        var sec=body.find('[data-name="k2pm_pair_secure"]').first();
        if(sec.length)sec.before('<div class="k2pm-cat">Y7 CORE</div>');
        var ts=body.find('[data-name="k2pm_ts_url"]').first();
        if(ts.length)ts.before('<div class="k2pm-cat">LG / TORRSERVER</div>');

        var hs=body.find('[data-name="k2pm_check_plugins"]').first();
        if(hs.length)hs.before('<div class="k2pm-cat">СТАН ПЛАГІНІВ</div>');

        var sysh=body.find('[data-name="k2pm_system_health"]').first();
        if(sysh.length)sysh.before('<div class="k2pm-cat">Y7 SYSTEM / REMOTE ADMIN</div>');
        var kid=body.find('[data-name="'+KIDS_MODE_KEY+'"]').first();
        if(kid.length)kid.before('<div class="k2pm-cat">ДІТИ / СИНХРОНІЗАЦІЯ</div>');
        var qual=body.find('[data-name="'+QUALITY_MIN_KEY+'"]').first();
        if(qual.length)qual.before('<div class="k2pm-cat">ЯКІСТЬ / SMART SOURCE</div>');
        var bkp=body.find('[data-name="k2pm_backup_now"]').first();
        if(bkp.length)bkp.before('<div class="k2pm-cat">BACKUP / UPDATE / QUARANTINE</div>');

        var sp=body.find('[data-name="'+START_PAGE_KEY+'"]').first();
        if(sp.length)sp.before('<div class="k2pm-cat">ЗАПУСК / ПОВЕДІНКА</div>');

        var ip=body.find('[data-name="'+IPTV_PRESET_KEY+'"]').first();
        if(ip.length)ip.before('<div class="k2pm-cat">IPTV — ГОТОВІ ПЛЕЙЛИСТИ</div>');

        var look=body.find('[data-name="k2pm_glass_preset"]').first();
        if(look.length)look.before('<div class="k2pm-cat">Y7 ВИГЛЯД</div>');

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
        if(bool(getStorage(KIDS_MODE_KEY,false))){
            body.find('[data-name="'+SISI_ON_KEY+'"]').hide();
            PLUGINS.forEach(function(p){if(p.cat==='adult')body.find('[data-name="'+key(p)+'"]').hide();});
        }
    }

    function listenSettings() {
        try{
            Lampa.Settings.listener.follow('open',function(e){
                if(!e||e.name!==COMPONENT)return;
                setTimeout(function(){openK2FullManager();},30);
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

        applyV400Migration();
        registerFullManager();
        setupSettings();
        listenSettings();
        var r=reconcile(true);
        if(!r.changed)needRestart(false);
        sendPolicy(true);
        heartbeat();
        if(HEARTBEAT_TIMER)clearInterval(HEARTBEAT_TIMER);
        HEARTBEAT_TIMER=setInterval(heartbeat,30000);
        if(COMMAND_TIMER)clearInterval(COMMAND_TIMER);
        COMMAND_TIMER=setInterval(pollAdminCommands,2500);
        setTimeout(function(){checkClientUpdate(false);},5000);

        window.K2PluginManager={
            version:VERSION,
            pair:startPairing,
            sync:function(){return reconcile(true);},
            checkLampac:checkSecureLampac,
            checkTorrServer:checkTorrServer,
            checkPlugins:function(){checkAllPlugins(true);},
            pluginHealth:healthCache,
            systemHealth:checkSystemHealth,
            providerHealth:checkProviderHealth,
            admin:startRemoteAdmin,
            backup:saveBackup,
            open:openK2FullManager
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

})('4.1.0');
