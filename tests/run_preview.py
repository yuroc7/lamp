"""Local-only UI harness and temporary bridge. No installation or production key.
python tests/run_preview.py ; open http://127.0.0.1:9133
"""
from pathlib import Path
import json,secrets,sys,threading,time
from http.server import ThreadingHTTPServer
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from y7_sport_bridge import Bridge,handler_for
ROOT=Path(__file__).resolve().parents[1]
core=Bridge({'access_key':secrets.token_urlsafe(36)})
class Handler(handler_for(core)):
    def do_POST(self):
        if not self.path.startswith('/bridge/'):return self.json_reply(404,{'error':'NOT_FOUND'})
        self.path=self.path[len('/bridge'):];super().do_POST()
    def do_GET(self):
        path=self.path.split('?',1)[0]
        if path.startswith('/bridge/'):
            self.path=self.path[len('/bridge'):];return super().do_GET()
        files={'/':ROOT/'tests/preview.html','/y7_sport.js':ROOT/'y7_sport.js','/y7_sport_feed.json':ROOT/'y7_sport_feed.json'}
        if path=='/preview-config.js':
            body=('Lampa.Storage.set("y7_sport_bridge_url","http://127.0.0.1:9133/bridge");Lampa.Storage.set("y7_sport_bridge_key",'+json.dumps(core.config['access_key'])+');').encode();mime='application/javascript'
        elif path in files:
            body=files[path].read_bytes();mime='text/html' if path=='/' else 'application/json' if path.endswith('.json') else 'application/javascript'
        else:return self.json_reply(404,{'error':'NOT_FOUND'})
        self.send_response(200);self.headers_common();self.send_header('Content-Type',mime+'; charset=utf-8');self.end_headers();self.wfile.write(body)
if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',9133),Handler)
    def reap():
        while True:time.sleep(30);core.cleanup()
    threading.Thread(target=reap,daemon=True).start()
    print('Local preview http://127.0.0.1:9133 — no production installation',flush=True)
    try:server.serve_forever()
    finally:
        for sid in list(core.sessions):core.stop(sid)
        server.server_close()
