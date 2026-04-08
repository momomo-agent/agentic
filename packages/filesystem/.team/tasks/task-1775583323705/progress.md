# Throw IOError on raw I/O failures in all backends

## Progress

- NodeFsBackend: get/set/delete now throw IOError on non-ENOENT failures
- OPFSBackend: get/set/delete now throw IOError on non-NotFoundError failures
- AgenticStoreBackend: get/set/delete/list all wrapped with IOError
- Build passes
