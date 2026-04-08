# 添加 code_exec 沙箱测试覆盖

## Progress

Added `describe('QuickJS sandbox')` block with 5 tests per design spec. Fixed error serialization in code.ts (vm.dump on error handle returns object, extracted .message). All 5 new tests pass. Pre-existing DBB-010 (top-level await) fails — QuickJS doesn't support it; out of scope.
