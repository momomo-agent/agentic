# Test Result: task-1775530542647

## Summary
- Total: 11 | Passed: 11 | Failed: 0

## Tests Run

### m76-cpu-profile.test.js (6 tests)
- PASS: cpu-only profile exists
- PASS: cpu-only uses gemma2:2b or gemma3:1b
- PASS: cpu-only uses q4 quantization
- PASS: cpu-only appears before catch-all
- PASS: apple-silicon profile intact
- PASS: nvidia profile intact

### Matcher verification (3 tests)
- PASS: matchProfile({ gpu: { type: 'cpu-only' } }) → gemma2:2b
- PASS: apple-silicon profile unaffected → gemma4:26b
- PASS: nvidia profile unaffected → gemma4:13b

## Verdict: PASS
