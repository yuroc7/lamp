"""Fail closed on known private material in public release files.

Additional check, not a guarantee that arbitrary files are secret-free. Publisher
stages only its explicit allowlist, never server files or .env.
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

PATTERNS=[re.compile(x) for x in (
    r'gh[pousr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{40,}',
    r'tskey-(?:auth|api)-[A-Za-z0-9_-]{16,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
)]
SECRET_QUERY={'x','key','token','auth','apikey','api_key','secret','signature','sig','session','expires','hdnea','hdnts','jwt'}

def check(root):
    issues=[]
    for p in root.rglob('*'):
        if not p.is_file() or any(x in p.parts for x in ('.git','__pycache__','.venv','publish-work')):continue
        if p.name in ('.env','init.conf','cookies.txt') or p.suffix in ('.pem','.key'):
            issues.append(str(p.relative_to(root))+': forbidden private file');continue
        if p.suffix not in ('.js','.cjs','.py','.ps1','.json','.md','.txt','.yml','.yaml'):continue
        try:text=p.read_text('utf-8-sig')
        except UnicodeError:continue
        if any(pattern.search(text) for pattern in PATTERNS):issues.append(str(p.relative_to(root))+': possible secret')
        if p.name not in ('y7_sport_feed.json','sport_channels.json'):continue
        data=json.loads(text)
        def walk(obj):
            if isinstance(obj,dict):
                for value in obj.values():walk(value)
            elif isinstance(obj,list):
                for value in obj:walk(value)
            elif isinstance(obj,str) and obj.startswith(('http://','https://')):
                u=urlsplit(obj)
                if u.username or u.password or SECRET_QUERY.intersection(k.lower() for k in parse_qs(u.query)):
                    issues.append(str(p.relative_to(root))+': credential/signed URL')
        walk(data)
    return sorted(set(issues))

if __name__=='__main__':
    issues=check(Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve())
    for issue in issues:print(issue)
    print('Public release check: '+('FAIL' if issues else 'PASS'))
    raise SystemExit(bool(issues))
