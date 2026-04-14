import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { transcribe } from '../../src/runtime/stt.js';
import { chat } from '../../src/server/core-bridge.js';
import { synthesize } from '../../src/runtime/tts.js';
import { measurePipeline } from '../../src/runtime/profiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const samples = [];
for (let i = 0; i < 5; i++) {
  const sttMs = transcribe._lastMs ?? 0;
  const llmMs = chat._lastMs ?? 0;
  const ttsMs = synthesize._lastMs ?? 0;
  const result = measurePipeline([
    { name: 'stt', durationMs: sttMs },
    { name: 'llm', durationMs: llmMs },
    { name: 'tts', durationMs: ttsMs },
  ]);
  samples.push(result.total);
}

samples.sort((a, b) => a - b);
const p50 = samples[Math.floor(samples.length * 0.5)];
const p95 = samples[Math.ceil(samples.length * 0.95) - 1] ?? samples[samples.length - 1];
const max = samples[samples.length - 1];
const pass = p95 <= 2000;

const report = { p50, p95, max, target: 2000, pass };
console.log(JSON.stringify(report, null, 2));
mkdirSync(__dirname, { recursive: true });
writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report));
if (!pass) process.exit(1);
