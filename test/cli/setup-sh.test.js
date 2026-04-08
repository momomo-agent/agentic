// Tests for install/setup.sh — DBB-004
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '../..');
const SETUP = path.join(ROOT, 'install/setup.sh');

function run(env = {}) {
  return spawnSync('sh', [SETUP], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30000,
  });
}

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    results.push({ name, pass: true });
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`);
    results.push({ name, pass: false, error: e.message });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('=== setup.sh tests (DBB-004) ===\n');

// DBB-004: script exists and is executable
test('setup.sh exists', () => {
  assert(fs.existsSync(SETUP), 'install/setup.sh not found');
});

test('setup.sh has shebang', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(content.startsWith('#!/'), 'Missing shebang');
});

test('setup.sh has set -e', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(content.includes('set -e'), 'Missing set -e');
});

// DBB-004: Node.js check
test('errors when node not found (PATH without node)', () => {
  const result = spawnSync('sh', [SETUP], {
    cwd: ROOT,
    env: { PATH: '/usr/bin:/bin' }, // no node
    encoding: 'utf8',
    timeout: 5000,
  });
  assert(result.status !== 0, 'Should exit non-zero when node missing');
  assert(
    result.stderr.includes('Node.js') || result.stderr.includes('node'),
    `Expected Node.js error message, got: ${result.stderr}`
  );
});

// DBB-004: Node version check logic in script
test('script checks Node.js >= 18', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(content.includes('18'), 'Script should check for Node.js >= 18');
});

// DBB-004: npm install step present
test('script runs npm install', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(content.includes('npm install'), 'Script should run npm install');
});

// DBB-004: starts service
test('script starts agentic-service', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(
    content.includes('agentic-service') || content.includes('bin/'),
    'Script should start the service'
  );
});

// DBB-004: idempotent — npm install --prefer-offline
test('npm install uses --prefer-offline for idempotency', () => {
  const content = fs.readFileSync(SETUP, 'utf8');
  assert(content.includes('--prefer-offline'), 'Should use --prefer-offline for idempotent installs');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

// Write test-result.md
const resultMd = `# Test Result: install/setup.sh 一键安装脚本

## Summary
- Passed: ${passed}
- Failed: ${failed}
- Total: ${passed + failed}

## DBB-004 Verification

${results.map(r => `- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n')}

## Edge Cases Identified
- No test for actual Node.js version < 18 rejection (requires mock node binary)
- No e2e test of full install flow (would require isolated environment)
- No test for npm install failure handling
`;

const taskDir = path.join(ROOT, '.team/tasks/task-1775500180912');
fs.mkdirSync(taskDir, { recursive: true });
fs.writeFileSync(path.join(taskDir, 'test-result.md'), resultMd);

// Write test-coverage.json
const coverage = {
  totalTests: passed + failed,
  passed,
  failed,
  edgeCases: [
    'Node.js version < 18 rejection (requires mock node binary)',
    'npm install failure handling',
    'Full e2e install in isolated environment',
  ],
  coverage: `${Math.round((passed / (passed + failed)) * 100)}%`,
};
const gapsDir = path.join(ROOT, '.team/gaps');
fs.mkdirSync(gapsDir, { recursive: true });
fs.writeFileSync(path.join(gapsDir, 'test-coverage.json'), JSON.stringify(coverage, null, 2));

if (failed > 0) process.exit(1);
