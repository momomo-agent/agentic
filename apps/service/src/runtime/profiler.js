const marks = new Map();
const metrics = new Map();

export function startMark(label) {
  marks.set(label, Date.now());
}

export function endMark(label) {
  const start = marks.get(label);
  if (!start) return null;
  const elapsed = Date.now() - start;
  marks.delete(label);
  const m = metrics.get(label) ?? { sum: 0, count: 0, last: 0 };
  metrics.set(label, { sum: m.sum + elapsed, count: m.count + 1, last: elapsed });
  return elapsed;
}

export function getMetrics() {
  const out = {};
  for (const [stage, { sum, count, last }] of metrics) {
    out[stage] = { last, avg: count ? Math.round(sum / count) : 0, count };
  }
  return out;
}

export function measurePipeline(stages) {
  const total = stages.reduce((s, st) => s + st.durationMs, 0);
  return { stages, total, pass: total < 2000 };
}
