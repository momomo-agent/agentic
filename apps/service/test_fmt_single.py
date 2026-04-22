#!/usr/bin/env python3
"""Single format test - run with: python3 test_fmt_single.py A"""
import json, urllib.request, subprocess, re, sys

FMT_ID = sys.argv[1] if len(sys.argv) > 1 else 'A'
RUNS = 3

FORMATS = {
    'A': ('HTML comment', 'Output ONLY HTML comment tags.\nSpeech: <!--vt:speech words-->\nCard: <!--vt:card {"key":"k","blocks":[{"type":"text","text":"x"}]}-->\nALL tags end with -->'),
    'B': ('Fenced block', 'Output ONLY fenced blocks.\n```vt:speech\nwords\n```\n```vt:card\n{"key":"k","blocks":[{"type":"text","text":"x"}]}\n```'),
    'C': ('Bracket prefix', 'Output ONLY bracket lines.\n[speech] words\n[card] {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.'),
    'D': ('XML tag', 'Output ONLY XML tags.\n<vt:speech>words</vt:speech>\n<vt:card>{"key":"k","blocks":[{"type":"text","text":"x"}]}</vt:card>'),
    'E': ('Pipe delimiter', 'Output ONLY pipe lines.\n|speech| words\n|card| {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.'),
}

CASES = [
    ('weather', '北京今天天气怎么样？给我一张天气卡片。', 1),
    ('stock',   '小米股价多少？给我一张股价卡片。', 1),
    ('multi',   '给我推荐2个北京餐厅，每个一张卡片。', 2),
]

name, sys_p = FORMATS[FMT_ID]

def parse(t):
    if FMT_ID == 'A':
        cards = []
        for m in re.finditer(r'<!--\s*vt:card\s+(\{)', t):
            s = m.start()+len(m.group())-1; d=0; j=''
            for i in range(s,len(t)):
                if t[i]=='{': d+=1
                elif t[i]=='}':
                    d-=1
                    if not d: j=t[s:i+1]; break
            try: cards.append(json.loads(j))
            except: pass
        return bool(re.search(r'<!--\s*vt:speech\s+.+?-->', t)), cards
    elif FMT_ID == 'B':
        cards=[]
        for m in re.finditer(r'```vt:card\n([\s\S]*?)\n```',t):
            try: cards.append(json.loads(m.group(1)))
            except: pass
        return '```vt:speech' in t, cards
    elif FMT_ID == 'C':
        cards=[]
        for line in t.split('\n'):
            m=re.match(r'^\[card\]\s*(\{.*\})\s*$',line.strip())
            if m:
                try: cards.append(json.loads(m.group(1)))
                except: pass
        return any(re.match(r'^\[speech\]',l.strip()) for l in t.split('\n')), cards
    elif FMT_ID == 'D':
        cards=[]
        for m in re.finditer(r'<vt:card>([\s\S]*?)</vt:card>',t):
            try: cards.append(json.loads(m.group(1)))
            except: pass
        return bool(re.search(r'<vt:speech>.+?</vt:speech>',t)), cards
    elif FMT_ID == 'E':
        cards=[]
        for line in t.split('\n'):
            m=re.match(r'^\|card\|\s*(\{.*\})\s*$',line.strip())
            if m:
                try: cards.append(json.loads(m.group(1)))
                except: pass
        return any(re.match(r'^\|speech\|',l.strip()) for l in t.split('\n')), cards
    return False,[]

def score(sp,cards,exp):
    s=(40 if sp else 0)+(min(len(cards),exp)*40//exp)
    if cards: s+=(10 if cards[0].get('key') else 0)+(10 if cards[0].get('blocks') else 0)
    return s

def gemma(user):
    r=urllib.request.urlopen(urllib.request.Request('http://localhost:11434/api/chat',
        json.dumps({'model':'gemma4:e4b','messages':[{'role':'system','content':sys_p},{'role':'user','content':user}],'stream':False,'options':{'temperature':0.3}}).encode(),
        {'Content-Type':'application/json'}),timeout=120)
    return json.loads(r.read()).get('message',{}).get('content','')

def cloud(user):
    r=subprocess.run(['llm','--system',sys_p,user],capture_output=True,text=True,timeout=30)
    return r.stdout.strip()

print(f'Format {FMT_ID}: {name}')
for cid,prompt,exp in CASES:
    gs,cs=[],[]
    for _ in range(RUNS):
        t=gemma(prompt); sp,cards=parse(t); gs.append(score(sp,cards,exp))
        t=cloud(prompt); sp,cards=parse(t); cs.append(score(sp,cards,exp))
    print(f'  {cid}: gemma={sum(gs)/RUNS:.0f} {gs}  cloud={sum(cs)/RUNS:.0f} {cs}')
