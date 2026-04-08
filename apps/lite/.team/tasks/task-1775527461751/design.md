# Task Design: 升级 code_exec 沙箱

## Task
Replace `new Function()` eval in `src/tools/code.ts` with `quickjs-emscripten` isolated sandbox.

## Files to Modify

- `src/tools/code.ts` — replace `executeCode` implementation
- `package.json` — add `quickjs-emscripten` dependency

## Function Signatures (unchanged)

```ts
export const codeToolDef: ToolDefinition  // no change

export async function executeCode(
  input: Record<string, unknown>
): Promise<CodeResult>
```

`CodeResult` from `../types.js`:
```ts
{ code: string; output: string; error?: string }
```

## Algorithm

1. Parse `input.code`; return early if empty
2. `const QuickJS = await getQuickJS()`
3. `const vm = QuickJS.newContext()`
4. Inject `console.log/warn/error` via `vm.newFunction` → push to `logs[]`
5. `vm.evalCode(code)` → check `result.error`
   - error path: dump + dispose + return `{ code, output: logs.join('\n'), error }`
   - success path: dump value, build output with `→ val` suffix if non-null
6. `vm.dispose()` in all paths

## Dependencies

```
quickjs-emscripten  (new)
```

## Edge Cases

| Input | Expected |
|---|---|
| `code = ''` | `{ error: 'No code provided' }` |
| runtime throw | `{ error: String(err) }` |
| `val === undefined` | omit `→` line |

## Test Cases

1. `executeCode({ code: '1+1' })` → `output: '→ 2'`
2. `executeCode({ code: 'console.log("x"); 5' })` → `output: 'x\n→ 5'`
3. `executeCode({ code: 'throw new Error("e")' })` → has `error`
4. `executeCode({ code: '' })` → `error: 'No code provided'`
