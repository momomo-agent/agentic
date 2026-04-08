import { test } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('m76-tunnel', async () => {
let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { console.log(`  PASS: ${name}`); passed++; }
  else { console.error(`  FAIL: ${name}`); failed++; }
}

// 1. src/tunnel.js exists
let src;
try {
  src = readFileSync(resolve('src/tunnel.js'), 'utf8');
  ok('src/tunnel.js exists', true);
} catch {
  ok('src/tunnel.js exists', false);
  src = '';
}

// 2. Uses isInstalled to check ngrok and cloudflared
ok('checks ngrok availability', src.includes('ngrok'));
ok('checks cloudflared availability', src.includes('cloudflared'));

// 3. Respects PORT env var
ok('respects PORT env var', src.includes('process.env.PORT'));

// 4. Handles neither-installed case with exit(1)
ok('exits on missing tools', src.includes('process.exit(1)'));

// 5. Handles SIGINT cleanup
ok('handles SIGINT', src.includes('SIGINT'));

// 6. package.json has tunnel script
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
ok('package.json has tunnel script', pkg.scripts && pkg.scripts.tunnel === 'node src/tunnel.js');

// 7. Neither tool installed → exits with code 1
const nodeBin = process.execPath.replace(/\/node$/, '');
const result = spawnSync(process.execPath, ['src/tunnel.js'], {
  env: { PATH: nodeBin },
  timeout: 3000
});
ok('exits 1 when no tunnel tool installed', result.status === 1);
ok('prints error message', (result.stderr || Buffer.alloc(0)).toString().includes('Error:'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
});
