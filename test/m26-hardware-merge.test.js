import { test } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detect } from '../src/detector/hardware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('m26-hardware-merge', async () => {
  const hw = await detect();
  console.assert(hw?.gpu?.type !== undefined, 'DBB-001 FAIL: gpu.type missing');
  console.assert(hw?.gpu?.vram !== undefined, 'DBB-001 FAIL: gpu.vram missing');

  const gpuDetectorPath = path.join(__dirname, '../src/detector/gpu-detector.js');
  console.assert(!existsSync(gpuDetectorPath), 'DBB-002 FAIL: gpu-detector.js still exists');
});
