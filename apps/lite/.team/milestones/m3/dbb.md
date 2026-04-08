# M3 Done-By-Definition (DBB)

## Verification Criteria

1. `src/tools/code.ts` does not contain `new Function` or bare `eval`
2. `quickjs-emscripten` is listed in `package.json` dependencies
3. `executeCode()` runs JS in a QuickJS sandbox and returns `{ code, output }` or `{ code, output, error }`
4. Sandbox captures `console.log/warn/error` output
5. Sandbox runs in Node.js (test suite passes)
6. Existing `code_exec` tool interface (`codeToolDef`, `executeCode`) is unchanged
7. At least one test covers successful execution and one covers error handling
