/**
 * E2E tests using agent-control (Playwright web driver).
 *
 * Starts agentic-service, drives the UI with `agent-control -p web`,
 * and validates real user flows end-to-end.
 *
 * Run:  npx vitest run apps/service/test/e2e/agent-control-e2e.test.js
 *
 * Requirements:
 *   - agent-control globally installed (`npm link`)
 *   - Ollama running with at least one model
 *   - Port 1234 free
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execSync } from 'child_process';
import { resolve } from 'path';
import { writeFileSync, unlinkSync } from 'fs';

const PORT = 1234;
const BASE = `http://localhost:${PORT}`;
const AC = 'agent-control -p web';
const TIMEOUT = 120_000;

let serviceProc;

// ── helpers ──

function ac(cmd, timeout = 15_000) {
  return execSync(`${AC} ${cmd}`, {
    encoding: 'utf-8',
    timeout,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  }).trim();
}

function acJSON(cmd, timeout = 15_000) {
  const raw = ac(cmd, timeout);
  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch {}
  }
  throw new Error(`No JSON in agent-control output: ${raw.slice(0, 200)}`);
}

/**
 * Evaluate JS in the browser via agent-control --file.
 * Writes JS to a temp file to avoid shell quoting issues.
 */
function acEval(jsCode, timeout = 15_000) {
  const tmpFile = `/tmp/ac-eval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.js`;
  writeFileSync(tmpFile, jsCode, 'utf-8');
  try {
    return acJSON(`eval --file ${tmpFile}`, timeout);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function curl(path, opts = '') {
  return execSync(`curl -sf ${opts} ${BASE}${path}`, { encoding: 'utf-8', timeout: 60_000 }).trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitFor(fn, timeoutMs = 10_000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch {}
    await sleep(intervalMs);
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

/** Find a snapshot ref by text match, then click it */
function findAndClick(text) {
  const snap = ac('snapshot', 20_000);
  const els = JSON.parse(snap);
  const el = els.find(e => (e.label || '').includes(text));
  if (!el) return { ok: false, error: `no element matching "${text}"` };
  return acJSON(`click ${el.ref}`);
}

function clickNav(label) {
  return acEval(`
    (function(){
      var btns = [].slice.call(document.querySelectorAll('.sidebar-nav button'));
      var b = btns.find(function(x){ return x.textContent.indexOf('${label}') !== -1 });
      if(b){ b.click(); return 'clicked' }
      return 'not-found'
    })()
  `);
}

function clickCard(label) {
  // Use eval to find .example-card by text and dispatch click event
  // This is more reliable than snapshot refs for Vue components
  return acEval(`
    (function(){
      var cards = [].slice.call(document.querySelectorAll('.example-card'));
      var c = cards.find(function(x){ return x.textContent.indexOf('${label}') !== -1 });
      if(c){ c.dispatchEvent(new MouseEvent('click', {bubbles:true})); return 'clicked' }
      return 'not-found'
    })()
  `);
}

function goBackToExamples() {
  return acEval(`
    (function(){
      var back = document.querySelector('.btn-back');
      if(back) back.click();
      return 'ok'
    })()
  `);
}

function mainText() {
  return acEval(`
    (function(){
      var m = document.querySelector('main') || document.body;
      return m.textContent.substring(0, 500)
    })()
  `);
}

// ── lifecycle ──

beforeAll(async () => {
  try { execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`); } catch {}
  await sleep(1000);

  const bin = resolve(process.cwd(), 'apps/service/bin/agentic-service.js');
  serviceProc = spawn('node', [bin, '--skip-setup', '--no-browser'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });

  await waitFor(async () => {
    try {
      const res = execSync(`curl -sf ${BASE}/health`, { encoding: 'utf-8', timeout: 3000 });
      return res.includes('ok');
    } catch { return false; }
  }, 30_000, 1000);

  ac(`open "${BASE}"`, 20_000);
  await sleep(3000);
}, 60_000);

afterAll(async () => {
  try { ac('close', 5000); } catch {}
  if (serviceProc) {
    serviceProc.kill('SIGTERM');
    await sleep(1000);
    if (!serviceProc.killed) serviceProc.kill('SIGKILL');
  }
  try { execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`); } catch {}
}, 15_000);

// ── Admin Dashboard ──

describe('Admin Dashboard', () => {
  it('loads with sidebar navigation', async () => {
    const result = acEval(`
      (function(){
        var sb = document.querySelector('.sidebar-brand');
        return sb ? sb.textContent.trim() : 'none'
      })()
    `);
    expect(result.ok).toBe(true);
    expect(result.value).toContain('Agentic Service');
  }, TIMEOUT);

  it('shows running status', async () => {
    const result = acEval(`
      (function(){
        var s = document.querySelector('.sidebar-status');
        return s ? s.textContent.trim() : 'none'
      })()
    `);
    expect(result.value).toContain('运行中');
  }, TIMEOUT);

  it('has all nav items', async () => {
    const snap = ac('-e snapshot', 20_000);
    expect(snap).toContain('系统状态');
    expect(snap).toContain('模型');
    expect(snap).toContain('配置');
    expect(snap).toContain('Examples');
  }, TIMEOUT);
});

// ── System Status Page ──

describe('System Status', () => {
  it('shows Ollama status', async () => {
    clickNav('系统状态');
    await sleep(2000);
    const text = mainText();
    expect(text.value).toMatch(/Ollama|ollama|运行|状态/);
  }, TIMEOUT);
});

// ── Model Management ──

describe('Model Management', () => {
  it('shows model cards or list', async () => {
    clickNav('模型');
    await sleep(2000);
    const text = mainText();
    expect(text.value).toMatch(/推荐|model|qwen|llama|gemma|下载|已安装/i);
  }, TIMEOUT);
});

// ── Config Page ──

describe('Config', () => {
  it('shows configuration options', async () => {
    clickNav('配置');
    await sleep(2000);
    const text = mainText();
    expect(text.value.length).toBeGreaterThan(30);
  }, TIMEOUT);
});

// ── Examples Page ──

describe('Examples', () => {
  it('shows example cards', async () => {
    clickNav('Examples');
    await sleep(2000);
    const count = acEval(`
      (function(){ return document.querySelectorAll('.example-card').length })()
    `);
    expect(count.value).toBeGreaterThan(5);
  }, TIMEOUT);

  it('can open Chat Playground', async () => {
    clickCard('Chat Playground');
    await sleep(3000);

    const check = acEval(`
      (function(){ return document.querySelector('.chat-panel') ? 'found' : 'none' })()
    `);
    expect(check.value).toBe('found');
  }, TIMEOUT);

  it('Chat Playground has input and send button', async () => {
    const check = acEval(`
      (function(){
        var input = document.querySelector('.chat-input-row input');
        var btn = document.querySelector('.chat-input-row button');
        return (input ? 'input' : 'no-input') + '+' + (btn ? 'btn' : 'no-btn')
      })()
    `);
    expect(check.value).toBe('input+btn');
  }, TIMEOUT);

  it('can type and send a chat message', async () => {
    const typed = acEval(`
      (function(){
        var input = document.querySelector('.chat-input-row input');
        if(!input) return 'no-input';
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'say hello');
        input.dispatchEvent(new Event('input', {bubbles: true}));
        return input.value
      })()
    `);
    expect(typed.value).toBe('say hello');

    acEval(`
      (function(){
        var btn = document.querySelector('.chat-input-row button');
        if(btn) btn.click();
        return 'ok'
      })()
    `);
  }, TIMEOUT);

  it('receives AI response in Chat Playground', async () => {
    await waitFor(async () => {
      const check = acEval(`
        (function(){
          var msgs = document.querySelectorAll('.chat-msg.assistant');
          for(var i=0; i<msgs.length; i++){
            var bubble = msgs[i].querySelector('.msg-bubble');
            if(bubble && bubble.textContent.trim().length > 0 && !bubble.classList.contains('loading')) return true
          }
          return false
        })()
      `);
      return check.value === true;
    }, 60_000, 2000);
  }, TIMEOUT);

  it('can open Parlor (voice chat) panel', async () => {
    goBackToExamples();
    await sleep(2000);
    clickCard('语音对话');
    await sleep(3000);

    const check = acEval(`
      (function(){ return document.querySelector('.parlor-panel') ? 'found' : 'none' })()
    `);
    expect(check.value).toBe('found');
  }, TIMEOUT);

  it('Parlor has push-to-talk button', async () => {
    const text = mainText();
    expect(text.value).toMatch(/按住|说话|push|talk/i);
  }, TIMEOUT);

  it('can open Subtitle panel', async () => {
    goBackToExamples();
    await sleep(2000);
    clickCard('实时字幕');
    await sleep(3000);

    const check = acEval(`
      (function(){ return document.querySelector('.subtitle-panel') ? 'found' : 'none' })()
    `);
    expect(check.value).toBe('found');
  }, TIMEOUT);

  it('can open Dictation panel', async () => {
    goBackToExamples();
    await sleep(2000);
    clickCard('连续听写');
    await sleep(3000);

    const check = acEval(`
      (function(){ return document.querySelector('.dictation-panel') ? 'found' : 'none' })()
    `);
    expect(check.value).toBe('found');
  }, TIMEOUT);

  it('can open Vision panel', async () => {
    goBackToExamples();
    await sleep(2000);
    clickCard('图像识别');
    await sleep(3000);

    const check = acEval(`
      (function(){ return document.querySelector('.vision-panel') ? 'found' : 'none' })()
    `);
    expect(check.value).toBe('found');
  }, TIMEOUT);
});

// ── API Endpoints ──

describe('API endpoints', () => {
  it('GET /health returns ok', () => {
    const data = JSON.parse(curl('/health'));
    expect(data.status).toBe('ok');
  });

  it('GET /api/status returns system info', () => {
    const data = JSON.parse(curl('/api/status'));
    expect(data).toHaveProperty('ollama');
  });

  it('GET /v1/models returns model list (OpenAI compat)', () => {
    const data = JSON.parse(curl('/v1/models'));
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('POST /api/chat returns a response', async () => {
    const res = curl('/api/chat', '-X POST -H "Content-Type: application/json" -d \'{"message":"say ok"}\'');
    expect(res.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it('POST /v1/chat/completions (OpenAI compat)', async () => {
    const body = '{"model":"auto","messages":[{"role":"user","content":"say ok"}],"max_tokens":10}';
    const res = curl('/v1/chat/completions', `-X POST -H "Content-Type: application/json" -d '${body}'`);
    const data = JSON.parse(res);
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it('POST /v1/chat/completions streaming', async () => {
    const body = '{"model":"auto","messages":[{"role":"user","content":"say ok"}],"max_tokens":10,"stream":true}';
    const res = curl('/v1/chat/completions', `-X POST -H "Content-Type: application/json" -d '${body}'`);
    expect(res).toContain('data:');
  }, TIMEOUT);
});
