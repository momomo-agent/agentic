import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readme = readFileSync(path.join(__dirname, '../README.md'), 'utf-8');

describe('M26 README docs', () => {
  it('DBB-013: README has npx agentic-service', () => expect(readme).toContain('npx agentic-service'))
  it('DBB-015: README documents /api/chat', () => expect(readme).toContain('/api/chat'))
  it('DBB-015: README shows request body with message field', () => expect(readme).toContain('message'))
})
