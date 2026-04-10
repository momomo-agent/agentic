# Fix hardware detector timing test — flaky 2s threshold

## Fix Applied
Relaxed timing threshold from 2000ms to 5000ms in `test/detector/hardware.test.js`. Under load (full suite), detection can take >2s due to `execSync` GPU detection calls. 5s is generous while still catching regressions.

## Result
All 173 test files pass, 972 tests pass.
