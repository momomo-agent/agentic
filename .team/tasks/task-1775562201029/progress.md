# fs adapter contract validation at shell init

## Progress

Added constructor validation for required methods: read, write, ls, delete, grep. Throws synchronously with clear error listing missing methods. Updated mv test mocks that were missing `grep`. All 141 tests pass.
