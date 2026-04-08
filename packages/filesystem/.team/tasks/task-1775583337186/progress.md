# Fix AgenticStoreBackend.stat() mtime accuracy

## Progress

- set() now stores mtime as `path + '\x00mtime'` key at write time
- stat() reads stored mtime instead of Date.now()
- delete() cleans up mtime meta key
- list() and scanStream() filter out '\x00' meta keys
- Build passes
