// Full E2E: WebSocket think (chat protocol) through agentic-service → Ollama
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:11234';
let reqId = 0;

function connectWS() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function wsThink(ws, prompt) {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    const start = performance.now();
    let firstDelta = 0, text = '', deltaCount = 0;
    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`timeout after 30s for reqId ${id}`));
    }, 30000);
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg._reqId !== id) return;
      if (msg.type === 'chat_delta') {
        if (!firstDelta) firstDelta = performance.now();
        text += msg.text || '';
        deltaCount++;
      } else if (msg.type === 'chat_end') {
        clearTimeout(timeout);
        ws.off('message', handler);
        const total = performance.now() - start;
        const ttfb = firstDelta ? firstDelta - start : total;
        resolve({ ttfb: Math.round(ttfb), total: Math.round(total), text: text || msg.text, deltaCount });
      } else if (msg.type === 'chat_error') {
        clearTimeout(timeout);
        ws.off('message', handler);
        reject(new Error(msg.error));
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      type: 'think',
      messages: [{ role: 'user', content: prompt }],
      _reqId: id
    }));
  });
}

function wsEmbed(ws, text) {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    const start = performance.now();
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg._reqId !== id) return;
      ws.off('message', handler);
      if (msg.type === 'rpc_result') resolve({ ms: Math.round(performance.now() - start), dims: msg.result?.embedding?.length || 0 });
      else reject(new Error(msg.error || 'embed failed'));
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ type: 'rpc', method: 'embed', params: { text }, _reqId: id }));
  });
}

console.log('Full E2E: iOS (WS) → agentic-service → Ollama → stream back');
console.log('Model: gemma4:e4b | Mac mini M4 24GB');
console.log('='.repeat(55));

const ws = await connectWS();
console.log('WebSocket connected');

// Warmup
console.log('\nWarming up...');
try {
  const warmup = await wsThink(ws, 'hi');
  console.log(`Warmup done: ${warmup.total}ms "${warmup.text.slice(0,30)}"`);
} catch (e) {
  console.log('Warmup error:', e.message);
  ws.close();
  process.exit(1);
}

console.log('\n── WebSocket Think via agentic-service (full pipeline) ──');
const prompts = ['Say hello in one word', 'What is 2+2? Just the number', 'Name one color', 'Count to 3', 'Is the sky blue? Yes or no'];
const ttfbs = [];
for (let i = 0; i < prompts.length; i++) {
  try {
    const r = await wsThink(ws, prompts[i]);
    ttfbs.push(r.ttfb);
    console.log(`  #${i+1} TTFB: ${r.ttfb}ms | Total: ${r.total}ms | Chunks: ${r.deltaCount} | "${r.text.replace(/\n/g,' ').slice(0,50)}"`);
  } catch (e) {
    console.log(`  #${i+1} ERROR: ${e.message}`);
  }
}
if (ttfbs.length > 0) {
  const avg = Math.round(ttfbs.reduce((a,b)=>a+b,0)/ttfbs.length);
  console.log(`  ${'─'.repeat(45)}`);
  console.log(`  Avg TTFB: ${avg}ms | Min: ${Math.min(...ttfbs)}ms | Max: ${Math.max(...ttfbs)}ms`);
}

console.log('\n── WebSocket Embed ──');
const ems = [];
for (let i = 1; i <= 5; i++) {
  const r = await wsEmbed(ws, `benchmark text ${i}`);
  ems.push(r.ms);
  console.log(`  #${i} ${r.ms}ms (${r.dims}d)`);
}
console.log(`  Avg: ${Math.round(ems.reduce((a,b)=>a+b,0)/ems.length)}ms`);

ws.close();
console.log('\n✅ Done');
process.exit(0);
