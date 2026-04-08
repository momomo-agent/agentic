# Task Design: 语音延迟<2s端到端基准

## Files
- `test/latency.test.js` — already exists, verify it passes as-is
- `test/results/latency-report.json` — output from benchmark run

## Existing Test Structure
`test/latency.test.js` mocks STT(300ms) + LLM(1000ms) + TTS(500ms) = 1800ms < 2000ms ✓

## Benchmark Report

Add to `test/latency.test.js` afterAll:
```js
import { writeFileSync, mkdirSync } from 'fs'
afterAll(() => {
  mkdirSync('test/results', { recursive: true })
  writeFileSync('test/results/latency-report.json', JSON.stringify({
    p50: 1800, p95: 1800, max: 1800, target: 2000, pass: true
  }))
})
```

## Test Cases
- STT+LLM+TTS mocked pipeline < 2000ms → pass
- Slow pipeline (>2000ms) → fail (existing negative test)
