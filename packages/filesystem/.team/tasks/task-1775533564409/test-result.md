# Test Result: task-1775533564409

## Summary
- Total: 16
- Passed: 16
- Failed: 0

## Results

### NodeFsBackend
- ✔ get/set
- ✔ get missing returns null
- ✔ delete
- ✔ delete missing resolves without error
- ✔ list includes set paths
- ✔ list with prefix
- ✔ scan match
- ✔ scan no match

### AgenticStoreBackend
- ✔ get/set
- ✔ get missing returns null
- ✔ delete
- ✔ delete missing resolves without error
- ✔ list includes set paths
- ✔ list with prefix
- ✔ scan match
- ✔ scan no match

## Edge Cases Identified
- Stateful backends: each backend instance shares state across tests in the same run (tests use same instance)
- OPFS backend skipped (browser-only)
- MemoryStorage backend not yet implemented (task-1775532383458 is todo/blocked)
