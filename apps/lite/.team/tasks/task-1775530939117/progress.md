# Fix multi-round tool loop in ask.ts

## Progress

### Investigation

Checked current `src/ask.ts` implementation (lines 26-56):
- Loop structure is correct: `for (let round = 0; round < MAX_TOOL_ROUNDS; round++)`
- Early return only happens when `stopReason !== 'tool_use'` (line 31)
- After tool execution, messages are appended and loop continues (lines 49-53)
- After loop exhaustion, throws error as expected (line 56)

### Git History

Commit af14ff1 ("feat: developer completed") already fixed this issue:
- **OLD behavior**: After executing tools, code did a "final call" without tools and returned immediately
- **NEW behavior**: After executing tools, appends assistant + tool messages and continues loop

### Test Verification

Ran all tests:
- `test/ask-loop.test.ts`: 2/2 passing
  - DBB-001: Multi-round loop continues through 2 tool rounds ✓
  - DBB-002: Loop throws after MAX_TOOL_ROUNDS ✓
- All 33 tests passing

### Conclusion

Task was already completed in commit af14ff1. Current implementation matches design specification exactly. No changes needed.
