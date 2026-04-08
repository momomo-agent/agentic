const samples = {};

export function record(stage, ms) {
  if (!samples[stage]) samples[stage] = [];
  samples[stage].push(ms);
  console.log(`[latency] ${stage}: ${ms}ms`);
}

export function p95(stage) {
  const arr = (samples[stage] ?? []).slice().sort((a, b) => a - b);
  if (!arr.length) return 0;
  return arr[Math.floor(arr.length * 0.95)];
}

export function reset() {
  for (const k of Object.keys(samples)) delete samples[k];
}
