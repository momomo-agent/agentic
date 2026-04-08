# Implement $(cmd) command substitution

## Progress

- Added `substituteCommands()` private async method with depth-tracking paren scanner
- Integrated after `substituteEnv()` in `exec()`: `afterEnv → substituteCommands → trimmed`
- 5 tests in `test/cmd-substitution-m21.test.ts` — all passing
