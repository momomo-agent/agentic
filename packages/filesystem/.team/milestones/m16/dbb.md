# m16 Done-By-Definition (DBB)

## DBB-001: IOError thrown on raw I/O failures
- NodeFsBackend.get() throws IOError when readFile fails with a non-ENOENT error
- NodeFsBackend.set() throws IOError on writeFile failure
- OPFSBackend.get() throws IOError on non-NotFoundError DOMException
- OPFSBackend.set() throws IOError on write failure
- AgenticStoreBackend.get/set/delete/list throw IOError when the underlying store throws
- SQLiteBackend already throws IOError — no regression

## DBB-002: OPFSBackend.stat() isDirectory detection
- stat('/dir') returns isDirectory: true when path is a directory handle
- stat('/file.txt') returns isDirectory: false for file handles
- stat('/missing') returns null

## DBB-003: AgenticStoreBackend.stat() real mtime
- stat() returns the mtime stored at write time, not Date.now()
- mtime is persisted alongside content in the store as a separate key or encoded value
- Two successive stat() calls on an unchanged file return the same mtime

## DBB-004: Streaming scan() for OPFSBackend and AgenticStoreBackend
- scanStream() yields results without loading all file content into memory at once
- For OPFSBackend: reads file as a stream (ReadableStream / chunked text decoder) and processes line-by-line
- For AgenticStoreBackend: since the store is key-value (no streaming), yields per-line lazily within the generator without buffering all files simultaneously
- scan() delegates to scanStream() (already the case — no regression)
