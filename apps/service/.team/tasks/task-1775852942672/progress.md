# Fix server config-persistence test — rapid PUTs return 500

## Root Cause
Same as task-1775852942421 — port collisions from random port selection in test files.

## Fix
Applied same fix: `startServer(0)` + `server.address().port`. See task-1775852942421/progress.md for details.

## Result
All 173 test files pass.
