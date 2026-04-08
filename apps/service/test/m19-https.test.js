import { readFileSync, existsSync } from 'fs';
import { describe, it, expect } from 'vitest';

const certSrc = readFileSync('src/server/cert.js', 'utf8');
const httpsSrc = readFileSync('src/server/httpsServer.js', 'utf8');
const apiSrc = readFileSync('src/server/api.js', 'utf8');
const binSrc = readFileSync('bin/agentic-service.js', 'utf8');

describe('M19 DBB-006: HTTPS server files exist', () => {
  it('src/server/cert.js exists', () => {
    expect(existsSync('src/server/cert.js')).toBe(true);
  });

  it('src/server/httpsServer.js exists', () => {
    expect(existsSync('src/server/httpsServer.js')).toBe(true);
  });
});

describe('M19 DBB-006: cert.js generates self-signed cert', () => {
  it('uses selfsigned package', () => {
    expect(certSrc).toContain('selfsigned');
  });

  it('exports generateCert function', () => {
    expect(certSrc).toContain('export function generateCert');
  });

  it('returns key and cert', () => {
    expect(certSrc).toContain('key');
    expect(certSrc).toContain('cert');
  });
});

describe('M19 DBB-006: httpsServer.js creates HTTPS server', () => {
  it('imports https module', () => {
    expect(httpsSrc).toContain("from 'https'");
  });

  it('imports generateCert', () => {
    expect(httpsSrc).toContain('generateCert');
  });

  it('exports createServer', () => {
    expect(httpsSrc).toContain('export function createServer');
  });

  it('calls https.createServer with key and cert', () => {
    expect(httpsSrc).toContain('https.createServer');
  });
});

describe('M19 DBB-006: api.js startServer supports https option', () => {
  it('startServer accepts https option', () => {
    expect(apiSrc).toContain('useHttps');
  });

  it('imports httpsServer when https enabled', () => {
    expect(apiSrc).toContain('httpsServer.js');
  });
});

describe('M19 DBB-007: --https flag wired in bin/agentic-service.js', () => {
  it('defines --https option', () => {
    expect(binSrc).toContain("'--https'");
  });

  it('passes https flag to startServer', () => {
    expect(binSrc).toContain('https: useHttps');
  });

  it('supports HTTPS_ENABLED env var', () => {
    expect(binSrc).toContain('HTTPS_ENABLED');
  });

  it('shows https:// in console when https enabled', () => {
    expect(binSrc).toContain("'https'");
  });
});
