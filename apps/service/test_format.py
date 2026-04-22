#!/usr/bin/env python3
import json, urllib.request, subprocess, tempfile, os

OLLAMA = 'http://localhost:11434/api/chat'
CLOUD_URL = 'https://api.xiaomimimo.com/anthropic/v1/messages'
CLOUD_KEY = 'sk-cab7xk30ccusvz8g3o1enwh2zbft6mkskw7dxlb0zyxs1s1r'
CLOUD_MODEL = 'claude-opus-4-6'

FORMATS = {
    'A': {
        'name': 'HTML comment (current)',
        'sys': '''Output ONLY HTML comment tags. No other text.
Speech: <!--vt:speech Your words here-->
Card:   <!--vt:card {"key":"k","blocks":[{"type":"text","text":"content"}]}-->
ALL tags MUST end with --> never use />'''
    },
    'B': {
        'name': 'Fenced block',
        'sys': '''Output ONLY fenced blocks. No other text.
```vt:speech
Your words here
```
```vt:card
{"key":"k","blocks":[{"type":"text","text":"content"}]}
```'''
    },
    'C': {
        'name': 'Bracket prefix',
        'sys': '''Output ONLY bracket-prefixed lines. No other text.
[speech] Your words here
[card] {"key":"k","blocks":[{"type":"text","text":"content"}]}
JSON must be single-line compact.'''
    }
}

PROMPTS = [
    ('weather', '北京今天天气怎么样？给我一张天气卡片。'),
    ('stock',   '小米股价多少？给我一张股价卡片。'),
    ('multi',   '给我推荐3个北京餐厅，每个一张卡片。'),
]

def post(url, data):
    req = urllib.request.Request(url, json.dumps(data).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def post_with_headers(url, headers, data):
    h = {'Content-Type': 'application/json'}
    h.update(headers)
    req = urllib.request.Request(url, json.dumps(data).encode(), h)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def call_gemma(sys, user):
    try:
        r = post(OLLAMA, {'model': 'gemma4:e4b', 'messages': [{'role':'system','content':sys},{'role':'user','content':user}], 'stream': False, 'options': {'temperature': 0.3}})
        return r.get('message', {}).get('content', '')
    except Exception as e:
        return f'ERROR: {e}'

def call_cloud(sys, user):
    try:
        f = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        f.write(sys + '\n\n' + user)
        f.close()
        r = subprocess.run(['llm', '--system', sys, user], capture_output=True, text=True, timeout=30)
        os.unlink(f.name)
        return r.stdout.strip()
    except Exception as e:
        return f'ERROR: {e}'

def parse_A(t):
    import re
    cards = []
    for m in re.finditer(r'<!--\s*vt:card\s+(\{)', t):
        s = m.start() + len(m.group()) - 1
        d, j = 0, ''
        for i in range(s, len(t)):
            if t[i] == '{': d += 1
            elif t[i] == '}':
                d -= 1
                if d == 0:
                    j = t[s:i+1]
                    break
        try: cards.append(json.loads(j))
        except: pass
    return bool(re.search(r'<!--\s*vt:speech\s+.+?-->', t)), cards

def parse_B(t):
    import re
    cards = []
    for m in re.finditer(r'```vt:card\n([\s\S]*?)\n```', t):
        try: cards.append(json.loads(m.group(1)))
        except: pass
    return '```vt:speech' in t, cards

def parse_C(t):
    cards = []
    for line in t.split('\n'):
        line = line.strip()
        if line.startswith('[card]'):
            try: cards.append(json.loads(line[6:].strip()))
            except: pass
    return any(l.strip().startswith('[speech]') for l in t.split('\n')), cards

PARSERS = {'A': parse_A, 'B': parse_B, 'C': parse_C}

def score(speech, cards):
    s = (40 if speech else 0) + (40 if cards else 0)
    if cards:
        s += 10 if cards[0].get('key') else 0
        s += 10 if cards[0].get('blocks') else 0
    return s

results = {}
print('=== Format Compliance Test ===\n')

for fid, fmt in FORMATS.items():
    results[fid] = {'g': [], 'c': []}
    print(f'\n--- Format {fid}: {fmt["name"]} ---')
    parse = PARSERS[fid]
    for pid, prompt in PROMPTS:
        print(f'  [gemma] {pid}...', end=' ', flush=True)
        gt = call_gemma(fmt['sys'], prompt)
        gs, gc = parse(gt)
        gsc = score(gs, gc)
        results[fid]['g'].append(gsc)
        print(f'speech={gs} cards={len(gc)} score={gsc}')
        if gsc < 80:
            print(f'    {gt[:150].replace(chr(10)," ")}')

        print(f'  [cloud] {pid}...', end=' ', flush=True)
        ct = call_cloud(fmt['sys'], prompt)
        cs, cc = parse(ct)
        csc = score(cs, cc)
        results[fid]['c'].append(csc)
        print(f'speech={cs} cards={len(cc)} score={csc}')
        if csc < 80:
            print(f'    {ct[:150].replace(chr(10)," ")}')

print('\n=== SUMMARY ===')
print(f'{"Format":<28}{"Gemma":<10}Cloud')
for fid, fmt in FORMATS.items():
    g = sum(results[fid]['g']) / len(PROMPTS)
    c = sum(results[fid]['c']) / len(PROMPTS)
    print(f'{fid+": "+fmt["name"]:<28}{str(int(g))+"/100":<10}{int(c)}/100')
