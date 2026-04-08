import { test } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('m90-tunnel-cert', async () => {
  let passed = 0, failed = 0;
  function ok(name, cond) {
    if (cond) { console.log(`  PASS: ${name}`); passed++; }
    else { console.error(`  FAIL: ${name}`); failed++; }
  }

  // --- tunnel.js: must export startTunnel(port), not be a top-level script ---
  let tunnelSrc = '';
  try {
    tunnelSrc = readFileSync(resolve('src/tunnel.js'), 'utf8');
    ok('src/tunnel.js exists', true);
  } catch {
    ok('src/tunnel.js exists', false);
  }

  ok('exports startTunnel function', tunnelSrc.includes('export function startTunnel') || tunnelSrc.includes('export const startTunnel'));
  ok('no top-level spawn (script-mode removed)', !(/^(let|const|var)\s+proc\s*=/m.test(tunnelSrc)));
  ok('startTunnel accepts port param', /startTunnel\s*\(\s*port/.test(tunnelSrc));
  ok('returns child process', tunnelSrc.includes('return') && tunnelSrc.includes('spawn'));
  ok('checks ngrok', tunnelSrc.includes('ngrok'));
  ok('checks cloudflared', tunnelSrc.includes('cloudflared'));
  ok('exits on neither installed', tunnelSrc.includes('process.exit(1)'));

  // --- cert.js: generateCert() returns { key, cert } ---
  let certSrc = '';
  try {
    certSrc = readFileSync(resolve('src/server/cert.js'), 'utf8');
    ok('src/server/cert.js exists', true);
  } catch {
    ok('src/server/cert.js exists', false);
  }

  ok('exports generateCert', certSrc.includes('export function generateCert'));
  ok('uses selfsigned', certSrc.includes('selfsigned'));
  ok('returns key and cert', certSrc.includes('key') && certSrc.includes('cert'));

  // --- selfsigned in package.json dependencies ---
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  ok('selfsigned in dependencies', 'selfsigned' in (pkg.dependencies || {}));

  // --- httpsServer.js calls generateCert ---
  let httpsSrc = '';
  try {
    httpsSrc = readFileSync(resolve('src/server/httpsServer.js'), 'utf8');
  } catch { /* optional */ }
  ok('httpsServer.js imports generateCert', httpsSrc.includes('generateCert'));

  // --- runtime: generateCert() actually returns valid PEM strings ---
  try {
    const { generateCert } = await import(resolve('src/server/cert.js'));
    const result = generateCert();
    ok('generateCert returns object', typeof result === 'object' && result !== null);
    ok('generateCert returns key string', typeof result.key === 'string' && result.key.length > 0);
    ok('generateCert returns cert string', typeof result.cert === 'string' && result.cert.length > 0);
    ok('key is PEM format', result.key.includes('-----BEGIN'));
    ok('cert is PEM format', result.cert.includes('-----BEGIN'));
  } catch (e) {
    ok('generateCert runtime import', false);
    console.error('  Error:', e.message);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
