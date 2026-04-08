// M28 DBB-003: HTTPS服务启动 / DBB-004: HTTP重定向到HTTPS
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const apiSrc = readFileSync('src/server/api.js', 'utf8');
const certSrc = readFileSync('src/server/cert.js', 'utf8');
const httpsSrc = readFileSync('src/server/httpsServer.js', 'utf8');

describe('DBB-003: HTTPS server starts on configured port', () => {
  it('startServer accepts https option', () => {
    expect(apiSrc).toMatch(/useHttps|https:/);
  });

  it('creates HTTPS server via httpsServer.js', () => {
    expect(apiSrc).toContain('./httpsServer.js');
  });

  it('listens on the given port when https enabled', () => {
    expect(apiSrc).toContain('listenAsync(httpsServer, port)');
  });

  it('logs https://localhost URL on startup', () => {
    expect(apiSrc).toContain('https://localhost:${port}');
  });

  it('prints LAN IP for multi-device access', () => {
    expect(apiSrc).toContain('LAN access: https://');
  });

  it('falls back to HTTP if cert generation fails', () => {
    expect(apiSrc).toContain('falling back to HTTP');
  });
});

describe('DBB-003: cert.js generates valid self-signed cert', () => {
  it('uses selfsigned library', () => {
    expect(certSrc).toContain('selfsigned');
  });

  it('returns key and cert', () => {
    expect(certSrc).toMatch(/return.*key.*cert|key.*pems|cert.*pems/);
  });
});

describe('DBB-003: httpsServer.js wraps app with TLS', () => {
  it('calls https.createServer with key and cert', () => {
    expect(httpsSrc).toContain('https.createServer');
    expect(httpsSrc).toContain('key');
    expect(httpsSrc).toContain('cert');
  });
});

describe('DBB-004: HTTP redirects to HTTPS', () => {
  it('creates HTTP redirect server on port 3001', () => {
    expect(apiSrc).toContain('HTTP_PORT = 3001');
  });

  it('responds with 301 redirect', () => {
    expect(apiSrc).toContain('301');
  });

  it('redirect Location points to https', () => {
    expect(apiSrc).toContain('https://${host}:${port}');
  });

  it('returns both http and https servers', () => {
    expect(apiSrc).toContain('return { http: redirectServer, https: httpsServer }');
  });

  it('handles redirect port conflict gracefully', () => {
    expect(apiSrc).toContain('HTTP redirect port');
    expect(apiSrc).toContain('skipping redirect');
  });
});
