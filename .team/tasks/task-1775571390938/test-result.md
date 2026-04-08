# Test Result — grep stdin no-match exitCode 1

## Summary (updated 2026-04-07)
- Total: 3
- Passed: 3
- Failed: 0

## Results

### PASS
- `cat /f.txt | grep nomatch` → exitCode 1, output '' ✓ (fixed)
- `cat /f.txt | grep hello` → exitCode 0 ✓
- `grep nomatch < /f.txt` → exitCode 1 ✓

## Verdict: DONE — all tests pass
