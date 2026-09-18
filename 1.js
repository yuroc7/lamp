/*
 * K2 Lampa Pack
 * File: 1.js
 * Version: 1.1.0
 *
 * Goal:
 * - keep standard Lampa UI intact;
 * - enable online functionality early;
 * - load Online MOD + Filmix and safe utility plugins;
 * - one broken child plugin must not stop the rest.
 */
(function () {
    'use strict';

    if (window.__K2_LAMPA_PACK_RUNNING__) return;
    window.__K2_LAMPA_PACK_RUNNING__ = true;

    var PACK_NAME = 'K2 Lampa Pack';
    var PACK_VERSION = '1.1.0';

    /*
     * IMPORTANT:
     * NB557 free.js currently only sets these flags.
     * We set them inline, immediately, to avoid a race with Lampa startup.
     */
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.dcma = false;
    window.lampa_settings.disable_features =
        window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;

    /*
     * Visual plugins that alter the standard Lampa home/movie UI are
     * intentionally DISABLED:
     *   - Stylish Interface
     *   - Full Hero
     */
    var PLUGINS = [
        {
            id: 'online_mod',
            name: 'Online MOD',
            url: 'https://nb557.github.io/plugins/online_mod.js',
            enabled: true
        },
        {
            id: 'filmix',
            name: 'Filmix Online',
            url: 'https://lampaplugins.github.io/store/fx.js',
            enabled: true
        },
        {
            id: 'improved_subtitles',
            name: 'Improved Subtitles',
            url: 'https://adambenhassen.github.io/subs.js',
            enabled: true
        },
        {
            id: 'status_serials',
            name: 'Status Serials',
            url: 'https://igorek1986.github.io/lampa-plugins/status.js',
            enabled: true
        },

        /* Keep standard Lampa appearance */
        {
            id: 'stylish_interface',
            name: 'Stylish Interface',
            url: 'https://igorek1986.github.io/lampa-plugins/int.js',
            enabled: false
        },
        {
            id: 'full_hero',
            name: 'Full Hero',
            url: 'https://igorek1986.github.io/lampa-plugins/full_hero.js',
            enabled: false
        },

        {
            id: 'profiles',
            name: 'Profiles',
            url: 'https://levende.github.io/lampa-plugins/profiles.js',
            enabled: true
        },
        {
            id: 'bookmarks_sync',
            name: 'Bookmarks Sync',
            url: 'https://levende.github.io/lampa-plugins/bookmarks-sync.js',
            enabled: true
        },
        {
            id: 'tmdb_networks',
            name: 'TMDB Networks',
            url: 'https://levende.github.io/lampa-plugins/tmdb-networks.js',
            enabled: true
        },
        {
            id: 'custom_favorites',
            name: 'Custom Favorites',
            url: 'https://levende.github.io/lampa-plugins/custom-favs.js',
            enabled: true
        },
        {
            id: 'myshows',
            name: 'MyShows Scrobbler',
            url: 'https://myshowsme.github.io/myshows-scrobbler-lampa/myshows.js',
            enabled: true
        },
        {
            id: 'torrserver_settings',
            name: 'TorrServer Settings',
            url: 'https://lampaplugins.github.io/store/pavelpikta/torrserver-settings.js',
            enabled: true
        },
        {
            id: 'torrent_styles',
            name: 'Torrent Styles MOD V2',
            url: 'https://lampaplugins.github.io/store/torrent_styles_v2.js',
            enabled: true
        },
        {
            id: 'yummyanime',
            name: 'YummyAnime',
            url: 'https://yummyanime.github.io/yummy-lampa-plugin/stable/index.js',
            enabled: false
        }
    ];

    var state = {
        version: PACK_VERSION,
        loaded: [],
        failed: [],
        skipped: [],
        started: Date.now(),
        finished: false
    };

    window.K2LampaPack = {
        version: PACK_VERSION,
        plugins: PLUGINS,
        state: state
    };

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[' + PACK_NAME + ']');
            console.log.apply(console, args);
        } catch (e) {}
    }

    function notify(text) {
        try {
            if (window.Lampa && Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show(text);
            }
        } catch (e) {}
    }

    function normalized(url) {
        return String(url || '').split('?')[0].replace(/\/+$/, '');
    }

    function alreadyPresent(plugin) {
        if (
            window.__K2_LAMPA_LOADED_PLUGINS__ &&
            window.__K2_LAMPA_LOADED_PLUGINS__[plugin.id]
        ) {
            return true;
        }

        try {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].src || '';

                if (
                    normalized(src) === normalized(plugin.url) ||
                    scripts[i].getAttribute('data-k2-plugin') === plugin.id
                ) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    }

    function markLoaded(plugin) {
        window.__K2_LAMPA_LOADED_PLUGINS__ =
            window.__K2_LAMPA_LOADED_PLUGINS__ || {};

        window.__K2_LAMPA_LOADED_PLUGINS__[plugin.id] = true;
    }

    function addScript(plugin, attempt, done) {
        var finished = false;
        var script = document.createElement('script');
        var timer;

        script.type = 'text/javascript';
        script.async = false;
        script.src = plugin.url;
        script.setAttribute('data-k2-plugin', plugin.id);

        function complete(ok, reason) {
            if (finished) return;
            finished = true;

            clearTimeout(timer);

            script.onload = null;
            script.onerror = null;
            script.onreadystatechange = null;

            if (ok) {
                markLoaded(plugin);
                state.loaded.push(plugin.name);
                log('loaded:', plugin.name);
                done();
                return;
            }

            if (attempt < 2) {
                log('retry:', plugin.name, reason || 'error');

                try {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                } catch (e) {}

                setTimeout(function () {
                    addScript(plugin, attempt + 1, done);
                }, 800);

                return;
            }

            state.failed.push({
                name: plugin.name,
                url: plugin.url,
                reason: reason || 'load error'
            });

            log('failed:', plugin.name, reason || 'load error');
            done();
        }

        script.onload = function () {
            complete(true);
        };

        script.onreadystatechange = function () {
            if (
                script.readyState === 'loaded' ||
                script.readyState === 'complete'
            ) {
                complete(true);
            }
        };

        script.onerror = function () {
            complete(false, 'network/script error');
        };

        timer = setTimeout(function () {
            complete(false, 'timeout');
        }, 20000);

        (document.head || document.body || document.documentElement)
            .appendChild(script);
    }

    function run(index) {
        if (index >= PLUGINS.length) {
            state.finished = true;
            state.elapsed_ms = Date.now() - state.started;

            log(
                'finished',
                'loaded=' + state.loaded.length,
                'failed=' + state.failed.length,
                'skipped=' + state.skipped.length
            );

            if (state.failed.length) {
                notify(
                    PACK_NAME +
                    ': завантажено ' +
                    state.loaded.length +
                    ', помилок ' +
                    state.failed.length
                );
            }

            return;
        }

        var plugin = PLUGINS[index];

        if (!plugin.enabled) {
            state.skipped.push(plugin.name + ' (disabled)');
            run(index + 1);
            return;
        }

        if (alreadyPresent(plugin)) {
            state.skipped.push(plugin.name + ' (already loaded)');
            run(index + 1);
            return;
        }

        addScript(plugin, 1, function () {
            setTimeout(function () {
                run(index + 1);
            }, 75);
        });
    }

    function bootstrap() {
        /*
         * Do NOT wait for appready.
         *
         * Direct Lampa extensions are normally executed while Lampa is starting,
         * and many plugins register their own app-ready listener. Loading them only
         * after ready can make some providers miss their initialization phase.
         */
        if (typeof window.Lampa === 'undefined') {
            setTimeout(bootstrap, 100);
            return;
        }

        log('start v' + PACK_VERSION);
        run(0);
    }

    bootstrap();
})();
