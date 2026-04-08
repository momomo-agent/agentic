# Task Design: Upgrade code_exec to quickjs-emscripten sandbox

## Objective
Replace unsafe `new Function()` or `eval()` implementation in `src/tools/code.ts` with `quickjs-emscripten` for true browser-compatible isolated sandbox execution.

## Current State Analysis
The current `src/tools/code.ts` already imports and uses `quickjs-emscripten`. This task may be verifying/documenting the existing implementation rather than implementing from scratch.

## Files to Modify

### 1. `src/tools/code.ts`
**Expected implementation:**

```ts
import { newAsyncContext, getQuickJS } from 'quickjs-emscripten'
import type { ToolDefinition } from '../providers/provider.js'
import type { CodeResult } from '../types.js'

export const codeToolDef: ToolDefinition = {
  name: 'code_exec',
  description: 'Execute JavaScript code. Returns console output and the last expression value.',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JavaScript code to execute' },
    },
    required: ['code'],
  },
}

export async function executeCode(
  input: Record<string, unknown>,
): Promise<CodeResult>
```

**Key implementation requirements:**

1. **Synchronous code path:**
   - Use `getQuickJS()` to get QuickJS instance
   - Create context with `QuickJS.newContext()`
   - Inject console methods (log, warn, error) that capture to logs array
   - Execute code with `vm.evalCode(code)`
   - Handle result/error and dispose VM properly

2. **Async code path (when code contains `await`):**
   - Use `newAsyncContext()` for async VM
   - Wrap code in async IIFE: `(async()=>{return(${code})})().then(...)`
   - Store result/error in global variables (`__asyncResult`, `__asyncError`)
   - Execute pending jobs with `runtime.executePendingJobs()`
   - Extract result from global variables
   - Dispose VM properly

3. **Console injection:**
   ```ts
   function injectConsole(vm) {
     const consoleHandle = vm.newObject()
     for (const method of ['log', 'warn', 'error']) {
       const fn = vm.newFunction(method, (...args) => {
         logs.push(args.map(h => String(vm.dump(h))).join(' '))
       })
       vm.setProp(consoleHandle, method, fn)
       fn.dispose()
     }
     vm.setProp(vm.global, 'console', consoleHandle)
     consoleHandle.dispose()
   }
   ```

4. **Result handling:**
   - Capture console output in `logs` array
   - Return last expression value with `→` prefix
   - Format: `{ code, output: logs.join('\n') + '\n→ ' + value }`
   - On error: `{ code, output: logs.join('\n'), error: errorMessage }`

5. **Memory management:**
   - Dispose all handles after use
   - Dispose VM context when done
   - No memory leaks

## Dependencies

### Package Installation
```json
{
  "dependencies": {
    "quickjs-emscripten": "^0.29.0"
  }
}
```

Already present in package.json - no installation needed.

## Edge Cases & Error Handling

1. **Empty code:** Return `{ code: '', output: '', error: 'No code provided' }`
2. **Syntax errors:** Captured by QuickJS, returned in error field
3. **Runtime errors:** Captured by QuickJS, returned in error field
4. **Async errors:** Captured via `__asyncError` global variable
5. **Undefined/null results:** Only show `→ value` if value is not undefined/null
6. **Multiple console calls:** All captured and joined with newlines

## Test Coverage

### Required tests in `test/code-tool.test.ts`:

1. **Basic execution:**
   ```ts
   executeCode({ code: '1 + 1' })
   // → { code: '1 + 1', output: '→ 2' }
   ```

2. **Console capture:**
   ```ts
   executeCode({ code: 'console.log("hello"); 5' })
   // → { code: '...', output: 'hello\n→ 5' }
   ```

3. **Error handling:**
   ```ts
   executeCode({ code: 'throw new Error("boom")' })
   // → { code: '...', output: '', error: 'boom' }
   ```

4. **Async support:**
   ```ts
   executeCode({ code: 'await Promise.resolve(42)' })
   // → { code: '...', output: '→ 42' }
   ```

5. **Empty code:**
   ```ts
   executeCode({ code: '' })
   // → { code: '', output: '', error: 'No code provided' }
   ```

6. **Multiple console methods:**
   ```ts
   executeCode({ code: 'console.warn("w"); console.error("e")' })
   // → { code: '...', output: 'w\ne' }
   ```

## Verification Steps

1. **Check implementation:**
   ```bash
   grep -n "quickjs-emscripten" src/tools/code.ts
   grep -n "new Function\|eval(" src/tools/code.ts
   ```
   - Should find quickjs-emscripten imports
   - Should NOT find `new Function()` or `eval()` calls

2. **Run tests:**
   ```bash
   pnpm test test/code-tool.test.ts
   ```
   - All tests should pass
   - Coverage should include sync, async, console, and error cases

3. **Browser compatibility check:**
   - QuickJS runs in browser via WebAssembly
   - No Node.js-specific APIs used (fs, child_process, etc.)
   - Verify in browser environment if possible

4. **Memory leak check:**
   - All handles disposed after use
   - VM context disposed in all code paths (success and error)

## Success Criteria

- ✅ `src/tools/code.ts` uses `quickjs-emscripten` (not `new Function` or `eval`)
- ✅ Synchronous code execution works
- ✅ Async code execution (with `await`) works
- ✅ Console methods (log, warn, error) captured
- ✅ Runtime errors captured without throwing
- ✅ Empty code returns clear error
- ✅ All test cases pass
- ✅ No memory leaks (all handles/VMs disposed)
- ✅ Browser-compatible (no Node.js dependencies)

## Notes

The current implementation in `src/tools/code.ts` already appears to use quickjs-emscripten correctly. This task may be a verification task rather than an implementation task. The developer should:

1. Verify the current implementation matches this design
2. Run all tests to confirm functionality
3. If implementation is already complete, mark task as done
4. If gaps exist, implement missing pieces according to this design
