# Test Result: Document custom provider fallback behavior

## Status: PASS

## Verification
- `ARCHITECTURE.md` lines 50-52 document all 3 fallback cases:
  1. customProvider set → use directly
  2. customProvider absent + baseUrl set → createOpenAIProvider fallback
  3. Both absent → throws error
- `README.md` lines 186-202 document the same with usage examples

## Test Results
- 73 passed, 1 failed (pre-existing: PRD.md missing shellResults — unrelated to this task)

## Conclusion
Documentation is complete in both ARCHITECTURE.md and README.md.
