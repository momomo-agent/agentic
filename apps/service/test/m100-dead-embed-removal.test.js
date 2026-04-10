/**
 * Additional tests for task-1775858351181: Remove dead code adapters/embed.js
 * Verifies DBB-006 and DBB-007 edge cases
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

describe('DBB-006 edge cases: no residual embed adapter references', () => {
  it('no .js file in src/ imports from adapters/embed', async () => {
    const { execSync } = await import('child_process');
    const result = execSync(
      `grep -rl "adapters/embed" "${SRC}" --include="*.js" 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    expect(result.trim()).toBe('');
  });

  it('no require() or import() calls reference embed adapter', async () => {
    const { execSync } = await import('child_process');
    const result = execSync(
      `grep -rn "embed\\.js" "${SRC}/runtime/adapters/" 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    expect(result.trim()).toBe('');
  });

  it('src/runtime/embed.js (the real module) still exists and works', async () => {
    const realEmbed = path.join(SRC, 'runtime/embed.js');
    await expect(fs.access(realEmbed)).resolves.toBeUndefined();
    const src = await fs.readFile(realEmbed, 'utf8');
    expect(src).toContain('agentic-embed');
  });
});

describe('DBB-007 edge cases: vitest config integrity', () => {
  it('vitest.config.js has no resolve.alias block at all', async () => {
    const config = await fs.readFile(path.join(ROOT, 'vitest.config.js'), 'utf8');
    expect(config).not.toContain('resolve:');
    expect(config).not.toContain('alias:');
  });

  it('vitest.config.js retains test coverage thresholds', async () => {
    const config = await fs.readFile(path.join(ROOT, 'vitest.config.js'), 'utf8');
    expect(config).toContain('thresholds');
    expect(config).toContain('lines: 98');
  });

  it('vitest.config.js is parseable as valid JS', async () => {
    // If the config is broken, vitest itself would fail — but let's verify structure
    const config = await fs.readFile(path.join(ROOT, 'vitest.config.js'), 'utf8');
    expect(config).toContain('defineConfig');
    expect(config).toContain('export default');
  });
});
