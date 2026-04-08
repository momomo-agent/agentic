import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

describe('agentic-voice package wiring', () => {
  it('package.json has agentic-voice dependency', async () => {
    const pkgPath = join(projectRoot, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies['agentic-voice']).toBeDefined();
  });

  it('stt.js imports from agentic-voice package (not local stubs)', async () => {
    const sttPath = join(projectRoot, 'src/runtime/stt.js');
    const content = await readFile(sttPath, 'utf-8');

    // Should use 'agentic-voice/*' not '#agentic-voice/*' or local paths
    expect(content).toMatch(/import\(['"]agentic-voice\/sensevoice['"]\)/);
    expect(content).toMatch(/import\(['"]agentic-voice\/whisper['"]\)/);
    expect(content).toMatch(/import\(['"]agentic-voice\/openai-whisper['"]\)/);

    // Should NOT use import map syntax
    expect(content).not.toMatch(/#agentic-voice/);
  });

  it('tts.js imports from agentic-voice package (not local stubs)', async () => {
    const ttsPath = join(projectRoot, 'src/runtime/tts.js');
    const content = await readFile(ttsPath, 'utf-8');

    // Should use 'agentic-voice/*' not '#agentic-voice/*' or local paths
    expect(content).toMatch(/import\(['"]agentic-voice\/kokoro['"]\)/);
    expect(content).toMatch(/import\(['"]agentic-voice\/piper['"]\)/);
    expect(content).toMatch(/import\(['"]agentic-voice\/openai-tts['"]\)/);

    // Should NOT use import map syntax
    expect(content).not.toMatch(/#agentic-voice/);
  });

  it('no local voice adapter stubs remain', async () => {
    const adaptersPath = join(projectRoot, 'src/runtime/adapters');

    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(adaptersPath);
      const voiceFiles = files.filter(f =>
        f.includes('voice') ||
        f.includes('tts') ||
        f.includes('stt') ||
        f.includes('kokoro') ||
        f.includes('piper') ||
        f.includes('sensevoice') ||
        f.includes('whisper')
      );

      expect(voiceFiles).toHaveLength(0);
    } catch (err) {
      // If adapters directory doesn't exist, that's fine
      if (err.code !== 'ENOENT') throw err;
    }
  });
});
