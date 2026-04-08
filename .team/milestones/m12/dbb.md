# M12 DBB — stat() Completeness, Agent Tool Parity & Auto Backend Selection

## DBB-001: stat() on AgenticStoreBackend returns correct shape
- Given: file set at /foo.txt
- Then: stat('/foo.txt') returns { size: number, mtime: number, isDirectory: false }
- Then: stat('/missing') returns null

## DBB-002: stat() on OPFSBackend returns correct shape
- Given: file set at /bar.txt (browser env)
- Then: stat('/bar.txt') returns { size: number, mtime: number, isDirectory: false }
- Then: stat('/missing') returns null

## DBB-003: createDefaultBackend() selects correct backend per environment
- Node.js → NodeFsBackend
- Browser + OPFS → OPFSBackend
- Browser + IndexedDB, no OPFS → AgenticStoreBackend
- No storage APIs → MemoryStorage

## DBB-004: ShellFS handles 'rm' command
- Given: file at /tmp/x.txt
- Then: exec('rm /tmp/x.txt') deletes file, returns ''
- Then: subsequent get returns null

## DBB-005: ShellFS handles 'tree' command
- Given: files /a/b.txt and /a/c.txt
- Then: exec('tree /a') returns tree-formatted string listing both files
