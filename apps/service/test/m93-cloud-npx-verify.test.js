// M93: Verify cloud fallback and npx entrypoint
// Covers task-1775583813385
import { strict as assert } from 'assert';
import { matchProfile } from '../src/detector/matcher.js';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);
const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..');
const profilesPath = join(root, 'profiles/default.json');
const cacheFile = path.join(os.homedir(), '.agentic-service', 'profiles.json');

// Pre-warm cache
const profilesData = JSON.parse(await readFile(profilesPath, 'utf8'));
await mkdir(path.dirname(cacheFile), { recursive: true });
await writeFile(cacheFile, JSON.stringify({ data: profilesData, timestamp: Date.now() }));

async function runScript(code, env = {}) {
  const tmp = path.join(os.tmpdir(), `llm-test-${Date.now()}.mjs`);
  await writeFile(tmp, code);
  try {
    const { stdout } = await execFileAsync('node', [tmp], {
      env: { ...process.env, ...env },
      timeout: 20000
    });
    return stdout.trim();
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('M93 Cloud Fallback + NPX Entrypoint tests\n');

// === NPX Entrypoint tests ===

await test('bin/agentic-service.js --help exits 0', async () => {
  try {
    const { stdout } = await execFileAsync('node', ['bin/agentic-service.js', '--help'], {
      cwd: root, timeout: 10000
    });
    assert.ok(stdout.includes('Usage:'), 'Help output should contain Usage');
    assert.ok(stdout.includes('agentic-service'), 'Help should mention agentic-service');
  } catch (e) {
    throw new Error(`--help exited with error: ${e.message}`);
  }
});

await test('bin/agentic-service.js --version exits 0', async () => {
  try {
    const { stdout } = await execFileAsync('node', ['bin/agentic-service.js', '--version'], {
      cwd: root, timeout: 10000
    });
    assert.ok(stdout.trim().match(/^\d+\.\d+\.\d+/), 'Version should be semver');
  } catch (e) {
    throw new Error(`--version exited with error: ${e.message}`);
  }
});

// === Cloud Fallback tests ===

await test('All profiles have fallback config', async () => {
  for (const p of profilesData.profiles) {
    assert.ok(p.config.fallback?.provider, `Profile missing fallback.provider: ${JSON.stringify(p.match)}`);
    assert.ok(p.config.fallback?.model, `Profile missing fallback.model: ${JSON.stringify(p.match)}`);
  }
});

await test('Default profile matches any hardware', async () => {
  const hardware = { platform: 'unknown', arch: 'unknown', gpu: { type: 'unknown' }, memory: 0 };
  const config = matchProfile(profilesData, hardware);
  assert.ok(config.fallback, 'Default profile must have fallback');
});

await test('Ollama fail → OpenAI fallback yields meta + content chunks', async () => {
  const out = await runScript(`
globalThis.fetch = async (url) => {
  if (url.includes('localhost:11434')) throw new Error('ECONNREFUSED');
  if (url.includes('openai.com')) {
    const enc = new TextEncoder();
    const body = new ReadableStream({ start(c) {
      c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"hello from cloud"}}]}\\n'));
      c.enqueue(enc.encode('data: [DONE]\\n'));
      c.close();
    }});
    return { ok: true, status: 200, body };
  }
  throw new Error('unexpected fetch: ' + url);
};
process.env.OPENAI_API_KEY = 'test-key';
const { chat } = await import(${JSON.stringify(join(root, 'src/runtime/llm.js'))});
const chunks = [];
for await (const c of chat('hi')) chunks.push(c);
const meta = chunks.find(c => c.type === 'meta');
const content = chunks.find(c => c.type === 'content');
if (!meta || meta.provider !== 'cloud') { console.error('NO META'); process.exit(1); }
if (!content || !content.content) { console.error('NO CONTENT'); process.exit(1); }
console.log('ok');
process.exit(0);
`, { OPENAI_API_KEY: 'test-key' });
  assert.ok(out.includes('ok'), `Unexpected: ${out}`);
});

await test('Ollama fail → Anthropic fallback yields content chunks', async () => {
  // Write a profile with anthropic fallback
  const anthropicProfile = {
    profiles: [{
      match: { default: true },
      config: {
        llm: { provider: 'ollama', model: 'llama3' },
        stt: { provider: 'default' },
        tts: { provider: 'default' },
        fallback: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
      }
    }]
  };
  await writeFile(cacheFile, JSON.stringify({ data: anthropicProfile, timestamp: Date.now() }));

  const out = await runScript(`
globalThis.fetch = async (url) => {
  if (url.includes('localhost:11434')) throw new Error('ECONNREFUSED');
  if (url.includes('anthropic.com')) {
    const enc = new TextEncoder();
    const body = new ReadableStream({ start(c) {
      c.enqueue(enc.encode('data: {"type":"content_block_delta","delta":{"text":"hi from claude"}}\\n'));
      c.enqueue(enc.encode('data: [DONE]\\n'));
      c.close();
    }});
    return { ok: true, status: 200, body };
  }
  throw new Error('unexpected fetch: ' + url);
};
process.env.ANTHROPIC_API_KEY = 'test-key';
const { chat } = await import(${JSON.stringify(join(root, 'src/runtime/llm.js'))});
const chunks = [];
for await (const c of chat('hi')) chunks.push(c);
const meta = chunks.find(c => c.type === 'meta');
const content = chunks.find(c => c.type === 'content');
if (!meta || meta.provider !== 'cloud') { console.error('NO META'); process.exit(1); }
if (!content || !content.content) { console.error('NO CONTENT'); process.exit(1); }
console.log('ok');
process.exit(0);
`, { ANTHROPIC_API_KEY: 'test-key' });
  assert.ok(out.includes('ok'), `Unexpected: ${out}`);

  // Restore default profiles cache
  await writeFile(cacheFile, JSON.stringify({ data: profilesData, timestamp: Date.now() }));
});

await test('Missing API key throws descriptive error on fallback', async () => {
  const out = await runScript(`
globalThis.fetch = async (url) => {
  if (url.includes('localhost:11434')) throw new Error('ECONNREFUSED');
  throw new Error('unexpected fetch: ' + url);
};
const { chat } = await import(${JSON.stringify(join(root, 'src/runtime/llm.js'))});
try {
  for await (const c of chat('hi')) {}
  console.error('NO THROW'); process.exit(1);
} catch(e) {
  if (!e.message.includes('not set') && !e.message.includes('API_KEY')) {
    console.error('BAD MSG: ' + e.message); process.exit(1);
  }
  console.log('ok');
  process.exit(0);
}
`, { OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' });
  assert.ok(out.includes('ok'), `Unexpected: ${out}`);
});

await test('Ollama success — no meta chunk, direct content', async () => {
  const out = await runScript(`
globalThis.fetch = async (url) => {
  if (url.includes('localhost:11434')) {
    const enc = new TextEncoder();
    const body = new ReadableStream({ start(c) {
      c.enqueue(enc.encode(JSON.stringify({message:{content:'hello from ollama'},done:true})+'\\n'));
      c.close();
    }});
    return { ok: true, status: 200, body };
  }
  throw new Error('unexpected fetch: ' + url);
};
const { chat } = await import(${JSON.stringify(join(root, 'src/runtime/llm.js'))});
const chunks = [];
for await (const c of chat('hi')) chunks.push(c);
if (chunks.some(c => c.type === 'meta')) { console.error('HAS META'); process.exit(1); }
if (!chunks.some(c => c.type === 'content')) { console.error('NO CONTENT'); process.exit(1); }
console.log('ok');
process.exit(0);
`);
  assert.ok(out.includes('ok'), `Unexpected: ${out}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
