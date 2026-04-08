import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

describe('DBB-010: README install instructions', () => {
  it('contains npx agentic-service', () => {
    expect(readme).toContain('npx agentic-service');
  });
  it('contains global install', () => {
    expect(readme).toMatch(/npm i -g|npm install -g/);
  });
  it('contains docker section', () => {
    expect(readme.toLowerCase()).toContain('docker');
  });
});

describe('DBB-011: README REST API docs', () => {
  it('contains API endpoint section', () => {
    expect(readme).toMatch(/\/api\//);
  });
  it('documents at least one endpoint with method', () => {
    expect(readme).toMatch(/POST|GET|PUT/);
  });
});
