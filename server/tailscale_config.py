"""Read-only validation of Y7's existing Tailscale topology.

Never writes Tailscale settings. The installer uses the official CLI to add one
mount and compares all remaining fields, including unrelated/private services.
"""
import argparse
import copy
import json
from pathlib import Path

MOUNT='/sport-bridge/'
TARGET='http://127.0.0.1:9122'

def without_sport(doc):
    value=copy.deepcopy(doc)
    for key,web in (value.get('Web') or {}).items():
        if not key.endswith(':443') or (value.get('AllowFunnel') or {}).get(key) is not True:continue
        handlers=web.get('Handlers') or {}
        handlers.pop(MOUNT,None);handlers.pop(MOUNT.rstrip('/'),None)
    return value

def inspect(doc):
    if not isinstance(doc,dict):raise ValueError('Tailscale status is not a configuration object')
    web=doc.get('Web') or {};funnel=doc.get('AllowFunnel') or {}
    candidates=[key for key in web if key.endswith('.ts.net:443') and funnel.get(key) is True]
    if len(candidates)!=1:raise ValueError('Expected exactly one existing public HTTPS Funnel on port 443')
    public=candidates[0];host=public.rsplit(':',1)[0];private=host+':8443'
    if str(((web[public].get('Handlers') or {}).get('/') or {}).get('Proxy','')).rstrip('/')!='http://127.0.0.1:9120':
        raise ValueError('Root Gateway route differs from the reviewed 127.0.0.1:9120 setup')
    if str((((web.get(private) or {}).get('Handlers') or {}).get('/') or {}).get('Proxy','')).rstrip('/')!='http://127.0.0.1:9132':
        raise ValueError('Private port 8443 differs from the reviewed 127.0.0.1:9132 setup')
    if funnel.get(private) is True:raise ValueError('Port 8443 must remain tailnet-only')
    for key in (public,private):
        port=key.rsplit(':',1)[1]
        if (doc.get('TCP',{}).get(port) or {}).get('HTTPS') is not True:raise ValueError('Expected HTTPS listener on '+port)
    handlers=web[public].get('Handlers') or {}
    if any(path.startswith(MOUNT) and path!=MOUNT for path in handlers):raise ValueError('Another service already uses a child of the Sport path')
    existing=[handlers[p] for p in (MOUNT,MOUNT.rstrip('/')) if p in handlers]
    if len(existing)>1:raise ValueError('Conflicting Sport mount points')
    if existing and existing[0]!={'Proxy':TARGET}:raise ValueError('Sport path already belongs to a different service')
    return {'host':host,'public_url':'https://'+host+MOUNT.rstrip('/'),'mount_present':bool(existing)}

def verify(before,after,removed=False):
    initial=inspect(before);current=inspect(after)
    if initial['host']!=current['host']:raise ValueError('Tailscale hostname changed')
    if without_sport(before)!=without_sport(after):raise ValueError('An existing route or Tailscale setting changed; inspect the private backup')
    if removed:
        if current['mount_present']:raise ValueError('Sport mount was not removed')
    elif not current['mount_present']:raise ValueError('Sport mount is missing after activation')
    return dict(current,preserved=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--before',required=True);p.add_argument('--after');p.add_argument('--removed',action='store_true');args=p.parse_args()
    try:
        before=json.loads(Path(args.before).read_text('utf-8-sig'))
        answer=verify(before,json.loads(Path(args.after).read_text('utf-8-sig')),args.removed) if args.after else inspect(before)
        print(json.dumps(answer));return 0
    except (OSError,ValueError,TypeError,AttributeError) as exc:
        print('Tailscale check: '+str(exc));return 1

if __name__=='__main__':raise SystemExit(main())
