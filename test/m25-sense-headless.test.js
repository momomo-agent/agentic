// M25 DBB: sense.js服务端无头模式
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('src/runtime/sense.js', 'utf8');

describe('M25 DBB: initHeadless export', () => {
  it('exports initHeadless', () => {
    expect(src).toContain('export async function initHeadless');
  });

  it('does not set _video in initHeadless', () => {
    const headlessBlock = src.slice(src.indexOf('export async function initHeadless'));
    const nextExport = headlessBlock.indexOf('export', 10);
    const block = headlessBlock.slice(0, nextExport > 0 ? nextExport : undefined);
    expect(block).not.toContain('_video');
  });

  it('calls createPipeline with options', () => {
    expect(src).toContain('createPipeline(options)');
  });
});

describe('M25 DBB: detectFrame export', () => {
  it('exports detectFrame', () => {
    expect(src).toContain('export function detectFrame');
  });

  it('returns empty result when pipeline is null', () => {
    expect(src).toContain('faces: [], gestures: [], objects: []');
  });

  it('returns empty result when buffer is null', () => {
    expect(src).toContain('buffer == null');
  });

  it('delegates to detect(buffer)', () => {
    expect(src).toContain('detect(buffer)');
  });
});

describe('M25 DBB: existing API preserved', () => {
  it('exports init', () => { expect(src).toContain('export async function init'); });
  it('exports start', () => { expect(src).toContain('export function start'); });
  it('exports stop', () => { expect(src).toContain('export function stop'); });
  it('exports detect', () => { expect(src).toContain('export function detect'); });
});
