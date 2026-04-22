#!/usr/bin/env python3
"""Format compliance test: 5 runs per case, Gemma e4b vs Claude (via llm CLI)"""
import json, urllib.request, subprocess, re, sys
from collections import defaultdict

OLLAMA = 'http://localhost:11434/api/chat'
RUNS = 5

FORMATS = {
    'A': {
        'name': 'HTML comment',
        'sys': 'Output ONLY HTML comment tags. No bare text.\nSpeech: <!--vt:speech words-->\nCard: <!--vt:card {"key":"k","blocks":[{"type":"text","text":"x"}]}-->\nALL tags end with --> never />',
    },
    'B': {
        'name': 'Fenced block',
        'sys': 'Output ONLY fenced blocks. No bare text.\n```vt:speech\nwords\n```\n```vt:card\n{"key":"k","blocks":[{"type":"text","text":"x"}]}\n```',
    },
    'C': {
        'name': 'Bracket prefix',
        'sys': 'Output ONLY bracket lines. No bare text.\n[speech] words\n[card] {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.',
    },
    'D': {
        'name': 'XML tag',
        'sys': 'Output ONLY XML tags. No bare text.\n<vt:speech>words</vt:speech>\n<vt:card>{"key":"k","blocks":[{"type":"text","text":"x"}]}</vt:card>',
    },
    'E': {
        'name': 'Pipe delimiter',
        'sys': 'Output ONLY pipe-delimited lines. No bare text.\n|speech| words\n|card| {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.',
    },
}

CASES = [
    ('weather', '北京今天天气怎么样？给我一张天气卡片。'),
    ('stock',   '小米股价多少？给我一张股价卡片。'),
    ('multi',   '给我推荐2个北京餐厅，每个一张卡片。'),
]

def parse(fmt_id, t):
    if fmt_id == 'A':
        cards = []
        for m in re.finditer(r'<!--\s*vt:card\s+(\{)', t):
            s = m.start() + len(m.group()) - 1
            d, j = 0, ''
            for i in range(s, len(t)):
                if t[i] == '{': d += 1
                elif t[i] == '}':
                    d -= 1
                    if not d: j = t[s:i+1]; break
            try: cards.append(json.loads(j))
            except: pass
        speech = bool(re.search(r'<!--\s*vt:speech\s+.+?-->', t))
        return speech, cards
    elif fmt_id == 'B':
        cards = []
        for m in re.finditer(r'```vt:card\n([\s\S]*?)\n```', t):
            try: cards.append(json.loads(m.group(1)))
            except: pass
        return '```vt:speech' in t, cards
    elif fmt_id == 'C':
        cards = []
        for line in t.split('\n'):
            m = re.match(r'^\[card\]\s*(\{.*\})\s*$', line.strip())
            if m:
                try: cards.append(json.loads(m.group(1)))
                except: pass
        return any(re.match(r'^\[speech\]', l.strip()) for l in t.split('\n')), cards
    elif fmt_id == 'D':
        cards = []
        for m in re.finditer(r'<vt:card>([\s\S]*?)</vt:card>', t):
            try: cards.append(json.loads(m.group(1)))
            except: pass
        return bool(re.search(r'<vt:speech>.+?</vt:speech>', t)), cards
    elif fmt_id == 'E':
        cards = []
        for line in t.split('\n'):
            m = re.match(r'^\|card\|\s*(\{.*\})\s*$', line.strip())
            if m:
                try: cards.append(json.loads(m.group(1)))
                except: pass
        return any(re.match(r'^\|speech\|', l.strip()) for l in t.split('\n')), cards
    return False, []

def score(speech, cards, expected_cards=1):
    s = (40 if speech else 0) + (min(len(cards), expected_cards) * 40 // expected_cards)
    if cards: s += (10 if cards[0].get('key') else 0) + (10 if cards[0].get('blocks') else 0)
    return s

def call_gemma(sys_p, user):
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(OLLAMA, json.dumps({
                'model': 'gemma4:e4b',
                'messages': [{'role':'system','content':sys_p},{'role':'user','content':user}],
                'stream': False, 'options': {'temperature': 0.3}
            }).encode(), {'Content-Type': 'application/json'}), timeout=60)
        return json.loads(r.read()).get('message',{}).get('content','')
    except Exception as e:
        return f'ERR:{e}'

def call_cloud(sys_p, user):
    try:
        r = subprocess.run(['llm', '--system', sys_p, user],
                           input=None, capture_output=True, text=True, timeout=30)
        return r.stdout.strip() or r.stderr.strip()
    except Exception as e:
        return f'ERR:{e}'

# Results: results[fmt][model][case] = list of scores
results = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

for fid, fmt in FORMATS.items():
    print(f'\n=== Format {fid}: {fmt["name"]} ===')
    for cid, prompt in CASES:
        exp = 2 if cid == 'multi' else 1
        g_scores, c_scores = [], []
        for run in range(RUNS):
            gt = call_gemma(fmt['sys'], prompt)
            gs, gc = parse(fid, gt)
            gsc = score(gs, gc, exp)
            g_scores.append(gsc)

            ct = call_cloud(fmt['sys'], prompt)
            cs, cc = parse(fid, ct)
            csc = score(cs, cc, exp)
            c_scores.append(csc)

        g_avg = sum(g_scores)/RUNS
        c_avg = sum(c_scores)/RUNS
        results[fid]['gemma'][cid] = g_scores
        results[fid]['cloud'][cid] = c_scores
        print(f'  {cid}: gemma={g_avg:.0f}/100 ({g_scores})  cloud={c_avg:.0f}/100 ({c_scores})')

print('\n=== FINAL SUMMARY ===')
print(f'{"Format":<25}{"Gemma avg":<12}{"Cloud avg":<12}{"Combined"}')
for fid, fmt in FORMATS.items():
    g_all = [s for case in results[fid]['gemma'].values() for s in case]
    c_all = [s for case in results[fid]['cloud'].values() for s in case]
    g = sum(g_all)/len(g_all) if g_all else 0
    c = sum(c_all)/len(c_all) if c_all else 0
    print(f'{fid+": "+fmt["name"]:<25}{g:.0f}/100      {c:.0f}/100      {(g+c)/2:.0f}/100')
