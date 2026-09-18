/*
 * K2 Lampa Pack
 * One URL -> loads a curated set of Lampa plugins automatically.
 *
 * Install in Lampa:
 * Settings -> Extensions -> Add plugin -> URL to this file.
 *
 * Notes:
 * - Child plugins are loaded at runtime and do not need to be entered manually.
 * - Edit PLUGINS below to enable/disable/add/remove plugins.
 * - Uses sequential loading, timeout, retry and duplicate protection.
 */
(function () {
    'use strict';

    if (window.__K2_LAMPA_PACK_RUNNING__) return;
    window.__K2_LAMPA_PACK_RUNNING__ = true;

    var PACK_NAME = 'K2 Lampa Pack';
    var PACK_VERSION = '1.0.0';

    /*
     * enabled: true  -> load automatically
     * enabled: false -> keep in the list but do not load
     *
     * For maximum compatibility, keep URLs on HTTPS whenever possible.
     */
    var PLUGINS = [
        {
            id: 'online_mod',
            name: 'Online MOD',
            url: 'https://nb557.github.io/plugins/online_mod.js',
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
        {
            id: 'stylish_interface',
            name: 'Stylish Interface',
            url: 'https://igorek1986.github.io/lampa-plugins/int.js',
            enabled: true
        },
        {
            id: 'full_hero',
            name: 'Full Hero',
            url: 'https://igorek1986.github.io/lampa-plugins/full_hero.js',
            enabled: true
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
        started: new Date().getTime(),
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

    function alreadyPresent(plugin) {
        if (window.__K2_LAMPA_LOADED_PLUGINS__ &&
            window.__K2_LAMPA_LOADED_PLUGINS__[plugin.id]) {
            return true;
        }

        try {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].src || '';
                if (src === plugin.url || scripts[i].getAttribute('data-k2-plugin') === plugin.id) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    }

    function markLoaded(plugin) {
        window.__K2_LAMPA_LOADED_PLUGINS__ = window.__K2_LAMPA_LOADED_PLUGINS__ || {};
        window.__K2_LAMPA_LOADED_PLUGINS__[plugin.id] = true;
    }

    function addScript(plugin, attempt, done) {
        var finished = false;
        var script = document.createElement('script');
        var timeoutMs = 15000;
        var timer;

        script.type = 'text/javascript';
        script.async = false;
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
                done(true);
            } else if (attempt < 2) {
                log('retry:', plugin.name, reason || 'error');
                try {
                    if (script.parentNode) script.parentNode.removeChild(script);
                } catch (e) {}
                setTimeout(function () {
                    addScript(plugin, attempt + 1, done);
                }, 700);
            } else {
                state.failed.push({
                    name: plugin.name,
                    url: plugin.url,
                    reason: reason || 'load error'
                });
                log('failed:', plugin.name, reason || 'load error');
                done(false);
            }
        }

        script.onload = function () {
            complete(true);
        };

        script.onreadystatechange = function () {
            if (script.readyState === 'loaded' || script.readyState === 'complete') {
                complete(true);
            }
        };

        script.onerror = function () {
            complete(false, 'network/script error');
        };

        timer = setTimeout(function () {
            complete(false, 'timeout');
        }, timeoutMs);

        var separator = plugin.url.indexOf('?') === -1 ? '?' : '&';
        script.src = plugin.url + separator + 'k2pack=' + encodeURIComponent(PACK_VERSION);

        (document.body || document.head || document.documentElement).appendChild(script);
    }

    function run(index) {
        if (index >= PLUGINS.length) {
            state.finished = true;
            state.elapsed_ms = new Date().getTime() - state.started;

            log(
                'finished',
                'loaded=' + state.loaded.length,
                'failed=' + state.failed.length,
                'skipped=' + state.skipped.length
            );

            // Show only if there is a problem; normal startup stays quiet.
            if (state.failed.length) {
                notify(
                    PACK_NAME + ': завантажено ' +
                    state.loaded.length + ', помилок ' + state.failed.length
                );
            }

            return;
        }

        var plugin = PLUGINS[index];

        if (!plugin.enabled) {
            state.skipped.push(plugin.name);
            run(index + 1);
            return;
        }

        if (alreadyPresent(plugin)) {
            state.skipped.push(plugin.name + ' (already loaded)');
            log('skip duplicate:', plugin.name);
            run(index + 1);
            return;
        }

        addScript(plugin, 1, function () {
            // Always continue, even if one plugin fails.
            setTimeout(function () {
                run(index + 1);
            }, 50);
        });
    }

    function start() {
        log('start v' + PACK_VERSION);

        // Small delay after Lampa reports ready, so base UI/plugins can initialize first.
        setTimeout(function () {
            run(0);
        }, 250);
    }

    if (window.appready) {
        start();
    } else if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') start();
        });
    } else {
        // Fallback for unusual builds.
        setTimeout(start, 1200);
    }
})();
