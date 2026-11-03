// Verbatim Kids 4.7.1 idle fragment from e715a665, for cached-version compatibility tests.
    var Y7_IDLE_LAST=Date.now(),Y7_IDLE_TIMER=0,Y7_IDLE_MOVE=0;
    function noteY7Activity(){Y7_IDLE_LAST=Date.now();}
    function y7VideoPlaying(){
        try{var vs=document.querySelectorAll('video');for(var i=0;i<vs.length;i++)if(!vs[i].paused&&!vs[i].ended&&vs[i].readyState>2)return true;}catch(e){}
        try{if(window.Lampa&&Lampa.Player&&typeof Lampa.Player.opened==='function'&&Lampa.Player.opened())return true;}catch(e2){}
        return false;
    }
    function y7GamesVisible(){try{return !!document.querySelector('.y7a-root');}catch(e){return false;}}
    function idleTick(){
        try{
            var st=readState();if(!st.screensaver||document.hidden||y7VideoPlaying()||y7GamesVisible())return;try{if(Lampa.Modal&&Lampa.Modal.opened&&Lampa.Modal.opened())return;}catch(em){}
            var mins=Math.max(1,Math.min(30,parseInt(st.screensaver_minutes,10)||5));
            if(Date.now()-Y7_IDLE_LAST>=mins*60000){Y7_IDLE_LAST=Date.now();openAquarium(true);}
        }catch(e){}
    }
    function installIdleAquarium(){
        if(Y7_IDLE_TIMER)return;Y7_IDLE_LAST=Date.now();
        try{document.addEventListener('keydown',noteY7Activity,true);document.addEventListener('mousedown',noteY7Activity,true);document.addEventListener('touchstart',noteY7Activity,true);document.addEventListener('click',noteY7Activity,true);document.addEventListener('pointermove',function(){var n=Date.now();if(n-Y7_IDLE_MOVE>600){Y7_IDLE_MOVE=n;noteY7Activity();}},true);}catch(e){}
        Y7_IDLE_TIMER=setInterval(idleTick,10000);
    }


