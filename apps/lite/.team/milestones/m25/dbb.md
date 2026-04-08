# M25 DBB — Vision Gap Closure: Final 18%

## Verification Criteria

### task-1775581632597: Auto-instantiate default AgenticFileSystem
- [ ] `ask()` with file tools but no `config.filesystem` does NOT throw
- [ ] `file_read` and `file_write` work zero-config
- [ ] Existing tests pass

### task-1775581637037: Shell exec browser safety
- [ ] `executeShell()` in browser returns `{ error: 'shell_exec is not available in browser environments', exitCode: 1 }` instead of crashing
- [ ] README documents shell_exec as Node.js-only
- [ ] All existing shell tests pass in Node

### task-1775581761671: Search graceful degradation
- [ ] `executeSearch()` with no apiKey returns `{ text: 'Search requires an API key — set toolConfig.search.apiKey', sources: [] }` instead of throwing
- [ ] No unhandled rejections from search tool
- [ ] All existing tests pass
