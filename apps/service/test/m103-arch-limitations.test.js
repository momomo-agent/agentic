/**
 * M103 ARCHITECTURE.md Known Limitations verification (task-1775896070855)
 * Verifies the documentation update is correct per design.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const archPath = resolve(import.meta.dirname, '../ARCHITECTURE.md');
const arch = readFileSync(archPath, 'utf8');

describe('ARCHITECTURE.md Known Limitations (已知限制)', () => {
  // Extract the section
  const sectionMatch = arch.match(/## 已知限制\n([\s\S]*?)(?=\n## |\n---|$)/);
  const section = sectionMatch ? sectionMatch[1] : '';

  it('section exists', () => {
    expect(arch).toContain('## 已知限制');
  });

  it('has exactly 3 limitation items', () => {
    const items = section.match(/^\d+\.\s/gm);
    expect(items).toHaveLength(3);
  });

  it('item 1: mDNS/Bonjour limitation is present', () => {
    expect(section).toContain('mDNS/Bonjour 未实现');
  });

  it('item 2: sense.js MediaPipe limitation is present', () => {
    expect(section).toContain('sense.js 视觉检测依赖 MediaPipe');
  });

  it('item 3: model_not_found limitation is present', () => {
    expect(section).toContain('model_not_found');
  });

  // Removed items should NOT appear
  it('removed: middleware.js error-only limitation is gone', () => {
    expect(section).not.toContain('middleware.js 仅含错误处理');
  });

  it('removed: cloud.js no-retry limitation is gone', () => {
    expect(section).not.toContain('cloud.js 无重试逻辑');
  });

  it('removed: incomplete graceful shutdown limitation is gone', () => {
    expect(section).not.toContain('优雅关闭不完整');
  });
});

describe('ARCHITECTURE.md source file references are accurate', () => {
  it('shutdown.js is documented', () => {
    expect(arch).toContain('shutdown.js');
  });

  it('shutdown.js file exists', () => {
    expect(existsSync(resolve(import.meta.dirname, '../src/server/shutdown.js'))).toBe(true);
  });

  it('cloud.js withRetry is documented or referenced', () => {
    // The architecture should reflect that retry is implemented
    // Check that cloud.js retry is no longer listed as a limitation
    const section = arch.match(/## 已知限制\n([\s\S]*?)(?=\n## |\n---|\Z)/)?.[1] || '';
    expect(section).not.toContain('cloud.js 无重试');
  });

  it('middleware.js auth is documented or referenced', () => {
    expect(arch).toContain('authMiddleware');
  });
});

describe('ARCHITECTURE.md M103 status accuracy', () => {
  it('documents registerShutdown export signature', () => {
    expect(arch).toContain('registerShutdown');
  });

  it('documents graceful shutdown as implemented', () => {
    // Should mention shutdown.js as implemented (✅) not as a limitation
    expect(arch).toContain('shutdown.js');
    // The known limitations should NOT list shutdown as incomplete
    const section = arch.match(/## 已知限制\n([\s\S]*?)(?=\n## |\n---|\Z)/)?.[1] || '';
    expect(section).not.toContain('关闭不完整');
  });
});
