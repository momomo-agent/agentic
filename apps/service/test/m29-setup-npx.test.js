// M29 DBB: setup.sh完善 + npx入口验证
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const setup = readFileSync('install/setup.sh', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bin = readFileSync('bin/agentic-service.js', 'utf8');

describe('M29 DBB: setup.sh', () => {
  it('supports curl-pipe global install via AGENTIC_GLOBAL=1', () => {
    expect(setup).toContain('AGENTIC_GLOBAL');
    expect(setup).toContain('npm install -g agentic-service');
  });

  it('checks Node >= 18', () => {
    expect(setup).toContain('18');
    expect(setup).toContain('Node.js');
  });

  it('exits on node not found', () => {
    expect(setup).toContain('Node.js not found');
  });
});

describe('M29 DBB: package.json bin field', () => {
  it('has bin.agentic-service pointing to bin/agentic-service.js', () => {
    expect(pkg.bin?.['agentic-service']).toBe('bin/agentic-service.js');
  });
});

describe('M29 DBB: bin/agentic-service.js', () => {
  it('has shebang as first line', () => {
    expect(bin.startsWith('#!/usr/bin/env node')).toBe(true);
  });
});
