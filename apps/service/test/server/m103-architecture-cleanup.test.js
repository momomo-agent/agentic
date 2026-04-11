/**
 * ARCHITECTURE.md cleanup verification for task-1775893487774 (M103)
 * DBB-010: No stale references to removed files/components
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const ARCH_PATH = path.resolve(import.meta.dirname, '../../ARCHITECTURE.md');

describe('DBB-010: ARCHITECTURE.md has no stale active references', () => {
  let content;
  let dirSection;

  it('ARCHITECTURE.md exists and is readable', async () => {
    content = await fs.readFile(ARCH_PATH, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
    // Extract directory structure code block
    const m = content.match(/## 目录结构[\s\S]*?```([\s\S]*?)```/);
    expect(m).not.toBeNull();
    dirSection = m[1];
  });

  it('directory structure does not list memory.js', () => {
    expect(dirSection).not.toMatch(/memory\.js/);
  });

  it('directory structure does not list ConfigPanel', () => {
    expect(dirSection).not.toMatch(/ConfigPanel/);
  });

  it('directory structure does not list LocalModelsView or CloudModelsView', () => {
    expect(dirSection).not.toMatch(/LocalModelsView/);
    expect(dirSection).not.toMatch(/CloudModelsView/);
  });

  it('no runtime API documentation section for memory.js', () => {
    // Check there's no "### Memory" subsection in the runtime docs area
    const runtimeSection = content.match(/## .*Runtime[\s\S]*?(?=\n## )/);
    if (runtimeSection) {
      expect(runtimeSection[0]).not.toMatch(/###.*[Mm]emory/);
    }
  });
});
