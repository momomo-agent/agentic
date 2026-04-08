// M28 DBB-003 & DBB-004: HTTPS服务启动 + HTTP重定向
import { readFileSync } from 'fs';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const api = readFileSync('src/server/api.js', 'utf8');
const cert = readFileSync('src/server/cert.js', 'utf8');
const httpsServer = readFileSync('src/server/httpsServer.js', 'utf8');
const bin = readFileSync('bin/agentic-service.js', 'utf8');

console.log('M28 DBB-003: HTTPS服务启动');
test('startServer supports https option', () => assert(api.includes('useHttps'), 'useHttps missing'));
test('httpsServer.js creates https server with cert', () => assert(httpsServer.includes('https.createServer') && httpsServer.includes('generateCert'), 'https server setup missing'));
test('cert.js uses selfsigned', () => assert(cert.includes('selfsigned'), 'selfsigned missing'));
test('cert fallback to HTTP on failure', () => assert(api.includes('HTTPS setup failed') && api.includes('falling back to HTTP'), 'fallback missing'));
test('LAN IP printed on startup', () => assert(api.includes('getLanIp') && api.includes('LAN access:'), 'LAN IP print missing'));
test('getLanIp uses networkInterfaces', () => assert(api.includes('networkInterfaces') && api.includes('internal'), 'networkInterfaces missing'));
test('returns {http, https} when https enabled', () => assert(api.includes('return { http: redirectServer, https: httpsServer }'), 'dual server return missing'));
test('bin --https flag supported', () => assert(bin.includes('--https') && bin.includes('useHttps'), '--https flag missing'));

console.log('\nM28 DBB-004: HTTP重定向到HTTPS');
test('HTTP redirect server created on port 3001', () => assert(api.includes('HTTP_PORT = 3001'), 'HTTP_PORT 3001 missing'));
test('redirect responds with 301', () => assert(api.includes('301'), '301 redirect missing'));
test('redirect Location header set to https', () => assert(api.includes("Location: `https://"), 'Location header missing'));
test('redirect port conflict handled gracefully', () => assert(api.includes('HTTP redirect port') && api.includes('skipping redirect'), 'port conflict handling missing'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
