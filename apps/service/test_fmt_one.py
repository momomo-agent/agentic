#!/usr/bin/env python3
"""Run one format, one case, one model. Args: FMT_ID CASE_ID MODEL(gemma|cloud) RUNS"""
import json, urllib.request, subprocess, re, sys

FMT_ID = sys.argv[1]
CASE_ID = sys.argv[2]
MODEL = sys.argv[3]
RUNS = int(sys.argv[4]) if len(sys.argv) > 4 else 3

FORMATS = {
    'A': 'Output ONLY HTML comment tags.\nSpeech: <!--vt:speech words-->\nCard: <!--vt:card {"key":"k","blocks":[{"type":"text","text":"x"}]}-->\nALL tags end with -->',
    'B': 'Output ONLY fenced blocks.\n```vt:speech\nwords\n```\n```vt:card\n{"key":"k","blocks":[{"type":"text","text":"x"}]}\n```',
    'C': 'Output ONLY bracket lines.\n[speech] words\n[card] {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.',
    'D': 'Output ONLY XML tags.\n<vt:speech>words</vt:speech>\n<vt:card>{"key":"k","blocks":[{"type":"text","text":"x"}]}</vt:card>',
    'E': 'Output ONLY pipe lines.\n|speech| words\n|card| {"key":"k","blocks":[{"type":"text","text":"x"}]}\nJSON single-line.',
}

CASES = {
    'weather': ('北京今天天气怎么样？给我一张天气卡片。', 1),
    'stock':   ('小米股价多少？给我一张股价卡片。', 1),
    'multi':   ('给我推荐2个北京餐厅，每个一张卡片。', 2),
}

sys_p = FORMATS[FMT_ID]
prompt, exp = CASES[CASE_ID]

def parse(t):
    if FMT_ID == 'A':
        cards=[]
        for m in re.finditer(r'<!--\s*vt:card\s+(\{)',t):
            s=m.start()+len(m.group())-1; d=0; j=''
            for i in range(s,len(t)):
                if t[i]=='{': d+=1
                elif t[i]=='}':
                    d-=1
                    if not d: j=t[s:i+1]; break
            try: cards.append(json.loads(j))
            except: pass
        return bool(re.search(r'<!--\s*vt:speech\s+.+?-->',t)), cards
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

def call(user):
    if MODEL == 'gemma':
        r=urllib.request.urlopen(urllib.request.Request('http://localhost:11434/api/chat',
            json.dumps({'model':'gemma4:e4b','messages':[{'role':'system','content':sys_p},{'role':'user','content':user}],'stream':False,'options':{'temperature':0.3}}).encode(),
            {'Content-Type':'application/json'}),timeout=120)
        return json.loads(r.read()).get('message',{}).get('content','')
    else:
        r=subprocess.run(['llm','--system',sys_p,user],capture_output=True,text=True,timeout=30)
        return r.stdout.strip()

scores=[]
for i in range(RUNS):
    t=call(prompt)
    sp,cards=parse(t)
    s=score(sp,cards,exp)
    scores.append(s)
    print(f'run{i+1}: score={s} speech={sp} cards={len(cards)}', flush=True)

avg=sum(scores)/RUNS
print(f'RESULT fmt={FMT_ID} case={CASE_ID} model={MODEL} avg={avg:.0f} scores={scores}', flush=True)
