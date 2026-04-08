# m16: IOError Propagation, stat() Parity & scan() Streaming

## Goals
- Backends throw IOError on raw I/O failures instead of returning null (DBB-008)
- OPFSBackend.stat() correctly detects directories (isDirectory)
- AgenticStoreBackend.stat() returns real mtime instead of Date.now()
- scan() in AgenticStoreBackend and OPFSBackend uses streaming instead of loading full file into memory

## Acceptance Criteria
- All backends throw IOError instances on I/O failures
- OPFSBackend.stat() returns isDirectory: true for directories
- AgenticStoreBackend.stat() mtime reflects actual file modification time
- scan() on all backends yields results incrementally without full file load
