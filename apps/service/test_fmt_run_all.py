#!/usr/bin/env python3
"""Orchestrate all format tests sequentially, save results to /tmp/fmt_results.json"""
import subprocess, json, sys

FMTS = ['A', 'B', 'C']
CASES = ['weather', 'stock', 'multi']
MODELS = ['gemma', 'cloud']
RUNS = 2
SCRIPT = '/Users/kenefe/LOCAL/momo-agent/projects/agentic/apps/service/test_fmt_one.py'
OUT = '/tmp/fmt_results.json'

results = {}
try:
    results = json.load(open(OUT))
except:
    pass

for fmt in FMTS:
    for case in CASES:
        for model in MODELS:
            key = f'{fmt}_{case}_{model}'
            if key in results:
                print(f'skip {key} (cached)')
                continue
            print(f'running {key}...', flush=True)
            r = subprocess.run(
                ['python3', SCRIPT, fmt, case, model, str(RUNS)],
                capture_output=True, text=True, timeout=180
            )
            out = r.stdout.strip()
            print(out)
            # parse RESULT line
            for line in out.split('\n'):
                if line.startswith('RESULT'):
                    import re
                    avg_m = re.search(r'avg=([\.\d]+)', line)
                    scores_m = re.search(r'scores=(\[[^\]]+\])', line)
                    if avg_m:
                        results[key] = {
                            'avg': float(avg_m.group(1)),
                            'scores': json.loads(scores_m.group(1)) if scores_m else []
                        }
            json.dump(results, open(OUT, 'w'), indent=2)

# Summary
print('\n=== SUMMARY ===')
print(f'{"Format":<6}{"Case":<10}{"Gemma":<10}Cloud')
for fmt in FMTS:
    for case in CASES:
        gk, ck = f'{fmt}_{case}_gemma', f'{fmt}_{case}_cloud'
        g = results.get(gk, {}).get('avg', '?')
        c = results.get(ck, {}).get('avg', '?')
        print(f'{fmt:<6}{case:<10}{str(g)+"  ":<10}{c}')
