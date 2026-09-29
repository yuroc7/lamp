/*
 * Y7 Media bundle bootstrap
 * Keeps Y7 Media v4.7.1 core unchanged in y7_core.js
 * and automatically loads Y7 Kids Arcade / Games.
 */
(function(){
    'use strict';

    var BUNDLE_VERSION = '1.1.0';
    if (window.__Y7_MEDIA_BUNDLE_110__) return;
    window.__Y7_MEDIA_BUNDLE_110__ = true;

    function baseUrl(){
        try{
            var s = document.currentScript && document.currentScript.src;
            if(s) return s.replace(/[?#].*$/,'').replace(/[^\/]+$/,'');
        }catch(e){}
        return 'https://yuroc7.github.io/lamp/';
    }

    var BASE = baseUrl();
    var FILES = [
        BASE + 'y7_core.js?v=471',
        BASE + 'y7_game.js?v=300'
    ];

    function notify(msg){
        try{
            if(window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(msg);
        }catch(e){}
    }

    function addScript(url, done){
        try{
            var s = document.createElement('script');
            s.async = false;
            s.src = url;
            s.onload = function(){ done(true); };
            s.onerror = function(){ done(false); };
            (document.head || document.body || document.documentElement).appendChild(s);
        }catch(e){ done(false); }
    }

    function loadAt(i){
        if(i >= FILES.length){
            try{ window.Y7_BUNDLE_VERSION = BUNDLE_VERSION; }catch(e){}
            return;
        }

        // Prefer Lampa loader when already available; DOM loader is the fallback.
        try{
            if(window.Lampa && Lampa.Utils && Lampa.Utils.putScript){
                Lampa.Utils.putScript(
                    [FILES[i]],
                    function(){ loadAt(i+1); },
                    function(){
                        notify('Y7: не вдалося завантажити ' + FILES[i].split('/').pop());
                        loadAt(i+1);
                    },
                    function(){},
                    true
                );
                return;
            }
        }catch(e){}

        addScript(FILES[i], function(ok){
            if(!ok) notify('Y7: не вдалося завантажити ' + FILES[i].split('/').pop());
            loadAt(i+1);
        });
    }

    loadAt(0);
})();
