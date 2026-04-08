# Update ARCHITECTURE.md to reflect current implementation

## Progress

### 2026-04-08 - Developer Agent

**COMPLETED: All 7 discrepancies resolved.**

Updated ARCHITECTURE.md to reflect the current implementation (978 lines in src/index.ts):

1. **Line count**: Updated "~400 lines" to "~978 lines" on line 9
2. **Exit codes**: Replaced "not currently implemented" with documentation of `{ output: string; exitCode: number }` return type with codes 0/1/2
3. **Pipe error short-circuit**: Added new subsection documenting how pipeline errors short-circuit (empty stdin to subsequent commands, exit code reflects first error)
4. **readOnly documentation**: Updated Permission Checking section to document that readOnly reads from `fs.readOnly` property via `checkWritable()`
5. **Implemented features**: Created new "Implemented Features" section with subsections for:
   - Exit Codes
   - Glob Pattern Support (matchGlob, expandGlob, expandRecursiveGlob, expandPathArgs)
   - Environment Variables ($VAR, ${VAR}, export)
   - Command Substitution ($(cmd), backticks)
   - Redirection (>, >>, <)
   - Background Jobs & Job Control (&, jobs, fg, bg)
6. **Extension Points**: Added note that glob expansion happens automatically in path arguments
7. **Future Enhancements**: Removed all implemented items, now only lists genuinely unimplemented features (tab completion, aliases, history, signal handling)
8. **Trailing CR text**: Removed all auto-merged CR text from lines 221-228
