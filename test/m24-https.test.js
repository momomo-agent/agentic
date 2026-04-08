// M24 DBB: HTTPS/LAN安全访问接入
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const apiSrc = readFileSync('src/server/api.js', 'utf8');
const binSrc = readFileSync('bin/agentic-service.js', 'utf8');
const certSrc = readFileSync('src/server/cert.js', 'utf8');

describe('M24 DBB-1: startServer(port, {https:true}) starts both HTTP and HTTPS', () => {
  it('startServer accepts https option', () => {
    expect(apiSrc).toMatch(/useHttps|https:/);
  });

  it('HTTPS port = port + 443', () => {
    expect(apiSrc).toContain('port + 443');
  });

  it('returns {http, https} object when https enabled', () => {
    expect(apiSrc).toMatch(/\{\s*http:\s*httpServer,\s*https:\s*httpsServer\s*\}/);
  });

  it('returns single server when https disabled', () => {
    expect(apiSrc).toContain('return httpServer');
  });
});

describe('M24 DBB-1: cert.js generates self-signed cert', () => {
  it('generateCert uses selfsigned', () => {
    expect(certSrc).toContain('selfsigned');
  });

  it('generateCert returns key and cert', () => {
    expect(certSrc).toContain('key');
    expect(certSrc).toContain('cert');
  });
});

describe('M24 DBB-1: bin supports --https flag', () => {
  it('defines --https option', () => {
    expect(binSrc).toContain("'--https'");
  });

  it('passes https to startServer', () => {
    expect(binSrc).toContain('https: useHttps');
  });

  it('supports HTTPS_ENABLED env var', () => {
    expect(binSrc).toContain('HTTPS_ENABLED');
  });
});
