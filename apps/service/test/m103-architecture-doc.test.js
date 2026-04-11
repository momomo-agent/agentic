/**
 * ARCHITECTURE.md Known Limitations verification for task-1775896070855 (M103)
 * DBB-010: No stale references
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const archPath = join(import.meta.dirname, '../ARCHITECTURE.md');
const archContent = readFileSync(archPath, 'utf8');

describe('ARCHITECTURE.md Known Limitations (DBB-010)', () => {
  it('has exactly 3 known limitations', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    const items = section.match(/^\d+\.\s/gm);
    expect(items?.length).toBe(3);
  });

  it('does NOT reference removed limitation: middleware.js 仅含错误处理', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).not.toContain('middleware.js 仅含错误处理');
  });

  it('does NOT reference removed limitation: cloud.js 无重试逻辑', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).not.toContain('cloud.js 无重试逻辑');
  });

  it('does NOT reference removed limitation: 优雅关闭不完整', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).not.toContain('优雅关闭不完整');
  });

  it('retains mDNS/Bonjour limitation', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).toContain('mDNS/Bonjour');
  });

  it('retains sense.js MediaPipe limitation', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).toContain('sense.js');
    expect(section).toContain('MediaPipe');
  });

  it('retains model_not_found limitation', () => {
    const section = archContent.split('## 已知限制')[1]?.split('\n## ')[0] || '';
    expect(section).toContain('model_not_found');
  });

  it('does not reference removed files as if they still exist', () => {
    // These items appear in "已删除" (deleted) table rows — acceptable as historical notes
    // Verify they don't appear as active components outside deletion records
    const lines = archContent.split('\n');

    for (const term of ['memory.js', 'ConfigPanel', 'LocalModels', 'CloudModels']) {
      const activeRefs = lines.filter(l => l.includes(term) && !l.includes('已删除'));
      expect(activeRefs.length, `${term} should not appear as active reference`).toBe(0);
    }
  });
});
