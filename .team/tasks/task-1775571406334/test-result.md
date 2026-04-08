# Test Result — 3+ stage pipe exit code propagation

## Summary
- Total: 3
- Passed: 3
- Failed: 0

## Results
- `cat /f.txt | grep hello | grep nomatch` → exitCode 1 ✓
- `cat /f.txt | grep hello | grep world` → exitCode 0 ✓
- `cat /f.txt | grep nomatch | grep hello` → exitCode 1 ✓

## Conclusion
All acceptance criteria met. Non-zero exitCode from middle/last grep stage propagates correctly.
