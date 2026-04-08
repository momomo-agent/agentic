# Fix OPFSBackend.delete() error handling

## Progress

Wrapped `delete()` in try/catch. Catches `DOMException` with `name === 'NotFoundError'` and returns silently. Re-throws all other errors. Done.
