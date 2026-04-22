#!/usr/bin/env node
import { promises as fs } from 'fs';

const OLLAMA = 'http://localhost:11434/api/chat';
const CLOUD  = 'http://localhost:1234/v1/chat/completions';

const FORMATS = {
  A: {
    name: 'HTML comment (current)',
    sys: `Output ONLY HTML comment tags. No other text.
Speech: <!--vt:speech Your words here-->
Card:   <!--vt:card {"key":"k","blocks":[{"type":"text","text":"content"}]}-->
ALL tags MUST end with --> never use />`,
    parse(t) {
      const cards = [];
      const re = /<!--\s*vt:card\s+(\{)/g;
      let m;
      while ((m = re.exec(t)) !== null) {
        const s = m.index + m[0].length - 1;
        let d = 0, i = s, j = '';
        for (; i < t.length; i++) {
          if (t[i] === '{') d++;
          else if (t[i] === '}') { d--; if (!d) { j = t.slice(s, i+1); break; } }
        }
        try { cards.push(JSON.parse(j)); } catch {}
      }
      return { speech: !!t.match(/<!--\s*vt:speech\s+.+?-->/), cards };
    }
  },
  B: {
    name: 'Fenced block',
    sys: `Output ONLY fenced blocks. No other text.
\`\`\`vt:speech
Your words here
\`\`\`
\`\`\`vt:card
{"key":"k","blocks":[{"type":"text","text":"content"}]}
\`\`\``,
    parse(t) {
      const cards = [];
      const re = /```vt:card\n([\s\S]*?)\n```/g;
      let m;
      while ((m = re.exec(t)) !== null) try { cards.push(JSON.parse(m[1])); } catch {}
      return { speech: /```vt:speech/.test(t), cards };
    }
  },
  C: {
    name: 'Bracket prefix',
    sys: `Output ONLY bracket-prefixed lines. No other text.
[speech] Your words here
[card] {"key":"k","blocks":[{"type":"text","text":"content"}]}
JSON must be single-line compact.`,
    parse(t) {
      const cards = [];
      for (const line of t.split('\n')) {
        const m = line.match(/^\[card\]\s*(\{.*\})\s*$/);
        if (m) try { cards.push(JSON.parse(m[1])); } catch {}
      }
      return { speech: /^\[speech\]/m.test(t), cards };
    }
  }
};

const PROMPTS = [
  { id: 'weather', text: '北京今天天气怎么样？给我一张天气卡片。' },
  { id: 'stock',   text: '小米股价多少？给我一张股价卡片。' },
  { id: 'multi',   text: '给我推荐3个北京餐厅，每个一张卡片。' },
];

async function gemma(sys, user) {
  const r = await fetch(OLLAMA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemma4:e4b', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false, options: { temperature: 0.3 } })
  });
  return (await r.json()).message?.content || '';
}

async function cloud(sys, user) {
  const r = await fetch(CLOUD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-6', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 800 })
  });
  if (!r.ok) return '';
  return (await r.json()).choices?.[0]?.message?.content || '';
}

function score(r) {
  return (r.speech ? 40 : 0) + (r.cards.length > 0 ? 40 : 0) + (r.cards[0]?.key ? 10 : 0) + (r.cards[0]?.blocks?.length ? 10 : 0);
}

const results = {};
console.log('=== Format Compliance Test ===\n');

for (const [fid, fmt] of Object.entries(FORMATS)) {
  results[fid] = { g: [], c: [] };
  console.log(`\n--- Format ${fid}: ${fmt.name} ---`);
  for (const p of PROMPTS) {
    process.stdout.write(`  [gemma] ${p.id}... `);
    const gt = await gemma(fmt.sys, p.text);
    const gr = fmt.parse(gt);
    const gs = score(gr);
    results[fid].g.push(gs);
    console.log(`speech=${gr.speech} cards=${gr.cards.length} score=${gs}`);
    if (gs < 80) console.log(`    output: ${gt.slice(0, 150).replace(/\n/g,' ')}`);

    process.stdout.write(`  [cloud] ${p.id}... `);
    const ct = await cloud(fmt.sys, p.text);
    const cr = fmt.parse(ct);
    const cs = score(cr);
    results[fid].c.push(cs);
    console.log(`speech=${cr.speech} cards=${cr.cards.length} score=${cs}`);
    if (cs < 80) console.log(`    output: ${ct.slice(0, 150).replace(/\n/g,' ')}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log('Format'.padEnd(28) + 'Gemma'.padEnd(10) + 'Cloud');
for (const [fid, fmt] of Object.entries(FORMATS)) {
  const g = (results[fid].g.reduce((a,b)=>a+b,0)/PROMPTS.length).toFixed(0);
  const c = (results[fid].c.reduce((a,b)=>a+b,0)/PROMPTS.length).toFixed(0);
  console.log(`${fid}: ${fmt.name}`.padEnd(28) + `${g}/100`.padEnd(10) + `${c}/100`);
}
