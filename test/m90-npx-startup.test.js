import { strict as assert } from 'assert';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Test 1: package.json bin field
async function testBinField() {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.bin?.['agentic-service'], 'bin.agentic-service missing');
  assert.equal(pkg.bin['agentic-service'], 'bin/agentic-service.js');
  console.log('✓ package.json bin field correct');
}

// Test 2: shebang on bin file
async function testShebang() {
  const content = await readFile(join(root, 'bin/agentic-service.js'), 'utf8');
  assert.ok(content.startsWith('#!/usr/bin/env node'), 'Missing shebang');
  console.log('✓ bin/agentic-service.js has shebang');
}

// Test 3: server starts and responds to /api/status
async function testServerStartup() {
  const port = 19877;
  const proc = spawn('node', ['bin/agentic-service.js', '--skip-setup', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  proc.stdout.on('data', d => output += d);
  proc.stderr.on('data', d => output += d);

  // Wait for server to be ready
  const ready = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 15000);
    const check = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${port}/api/status`);
        if (res.ok) { clearInterval(check); clearTimeout(timeout); resolve(true); }
      } catch {}
    }, 300);
  });

  proc.kill('SIGINT');
  await new Promise(r => proc.on('close', r));

  assert.ok(ready, `Server did not start in time. Output:\n${output}`);
  console.log('✓ Server started and /api/status returned 200');
}

// Test 4: SIGINT exits cleanly
async function testSigintClean() {
  const port = 19878;
  const proc = spawn('node', ['bin/agentic-service.js', '--skip-setup', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  // Wait briefly then send SIGINT
  await new Promise(r => setTimeout(r, 3000));
  proc.kill('SIGINT');
  const code = await new Promise(r => proc.on('close', r));
  assert.ok(code === 0 || code === null || code === 130, `Non-clean exit: ${code}`);
  console.log('✓ SIGINT exits cleanly');
}

const tests = [testBinField, testShebang, testServerStartup, testSigintClean];
let passed = 0, failed = 0;
for (const t of tests) {
  try { await t(); passed++; }
  catch (e) { console.error(`✗ ${t.name}: ${e.message}`); failed++; }
}
console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
