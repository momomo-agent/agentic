# memory.js 并发写 mutex 修复

## Progress

Added promise-chain mutex (`_lock`) to `add()` in `src/runtime/memory.js`. Sequential chaining prevents concurrent read-modify-write races on INDEX_KEY.
