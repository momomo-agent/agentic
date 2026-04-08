// M25 DBB: sense.js服务端无头模式
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const src = readFileSync('src/runtime/sense.js', 'utf8');

describe('M25 DBB: sense.js headless server mode', () => {
  it('exports initHeadless', () => {
    expect(src).toContain('export async function initHeadless');
  });

  it('exports detectFrame', () => {
    expect(src).toContain('export function detectFrame');
  });

  it('initHeadless does not set _video', () => {
    expect(src).toContain('initHeadless');
    // initHeadless should NOT set pipeline._video
    const headlessBlock = src.slice(src.indexOf('export async function initHeadless'));
    const nextExport = headlessBlock.indexOf('\nexport', 1);
    const block = headlessBlock.slice(0, nextExport > 0 ? nextExport : undefined);
    expect(block).not.toContain('_video');
  });

  it('detectFrame returns empty result before init', () => {
    expect(src).toContain('buffer == null');
  });

  it('detectFrame delegates to detect()', () => {
    expect(src).toContain('return detect(buffer)');
  });

  it('existing init/start/stop/detect exports preserved', () => {
    expect(src).toContain('export async function init');
    expect(src).toContain('export function start');
    expect(src).toContain('export function stop');
    expect(src).toContain('export function detect');
  });
});
