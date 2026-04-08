# Test Result: task-1775525816399 — custom provider support

## Summary
- Tests: 2 passed, 0 failed
- DBB-013: PASS (both cases)

## Results

### DBB-013a: custom provider used
- customProvider.chat() called once, result.answer === 'custom-result'
- PASS

### DBB-013b: throws when customProvider missing
- provider='custom' with no customProvider → throws with 'customProvider' in message
- PASS
