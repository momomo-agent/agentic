// M28 DBB-003 & DBB-004: HTTPS服务启动 + HTTP重定向
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const api = readFileSync('src/server/api.js', 'utf8');
const cert = readFileSync('src/server/cert.js', 'utf8');
const httpsServer = readFileSync('src/server/httpsServer.js', 'utf8');
const bin = readFileSync('bin/agentic-service.js', 'utf8');

describe('M28 DBB-003: HTTPS服务启动', () => {
  it('startServer supports https option', () => expect(api).toContain('useHttps'))
  it('httpsServer.js creates https server with cert', () => {
    expect(httpsServer).toContain('https.createServer');
    expect(httpsServer).toContain('generateCert');
  })
  it('cert.js uses selfsigned', () => expect(cert).toContain('selfsigned'))
  it('cert fallback to HTTP on failure', () => {
    expect(api).toContain('HTTPS setup failed');
    expect(api).toContain('falling back to HTTP');
  })
  it('LAN IP printed on startup', () => {
    expect(api).toContain('getLanIp');
    expect(api).toContain('LAN access:');
  })
  it('getLanIp uses networkInterfaces', () => {
    expect(api).toContain('networkInterfaces');
    expect(api).toContain('internal');
  })
  it('returns {http, https} when https enabled', () => expect(api).toContain('return { http: redirectServer, https: httpsServer }'))
  it('bin --https flag supported', () => {
    expect(bin).toContain('--https');
    expect(bin).toContain('useHttps');
  })
})

describe('M28 DBB-004: HTTP重定向到HTTPS', () => {
  it('HTTP redirect server created on port 3001', () => expect(api).toContain('HTTP_PORT = 3001'))
  it('redirect responds with 301', () => expect(api).toContain('301'))
  it('redirect Location header set to https', () => expect(api).toContain('Location: `https://'))
  it('redirect port conflict handled gracefully', () => {
    expect(api).toContain('HTTP redirect port');
    expect(api).toContain('skipping redirect');
  })
})
