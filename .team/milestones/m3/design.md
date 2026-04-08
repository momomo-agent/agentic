# M3 Technical Design: Code Sandbox & Quality Gates

## Approach

Replace the `new Function()` eval in `src/tools/code.ts` with a `quickjs-emscripten` sandbox. The public interface (`codeToolDef`, `executeCode`) stays identical.

## Dependency

```
pnpm add quickjs-emscripten
```

## Implementation

### `src/tools/code.ts`

Replace the current `executeCode` body with:

```ts
import { getQuickJS } from 'quickjs-emscripten'

export async function executeCode(input: Record<string, unknown>): Promise<CodeResult> {
  const code = String(input.code ?? '')
  if (!code) return { code: '', output: '', error: 'No code provided' }

  const QuickJS = await getQuickJS()
  const vm = QuickJS.newContext()
  const logs: string[] = []

  // Inject console
  const consoleHandle = vm.newObject()
  for (const method of ['log', 'warn', 'error']) {
    const fn = vm.newFunction(method, (...args) => {
      logs.push(args.map(a => vm.dump(a)).join(' '))
    })
    vm.setProp(consoleHandle, method, fn)
    fn.dispose()
  }
  vm.setProp(vm.global, 'console', consoleHandle)
  consoleHandle.dispose()

  try {
    const result = vm.evalCode(code)
    if (result.error) {
      const err = vm.dump(result.error)
      result.error.dispose()
      vm.dispose()
      return { code, output: logs.join('\n'), error: String(err) }
    }
    const val = vm.dump(result.value)
    result.value.dispose()
    vm.dispose()
    const output = [
      ...logs,
      ...(val !== undefined && val !== null ? [`→ ${String(val)}`] : []),
    ].join('\n')
    return { code, output }
  } catch (err) {
    vm.dispose()
    return { code, output: logs.join('\n'), error: String(err) }
  }
}
```

## Edge Cases

- `code` is empty → return early with `error: 'No code provided'`
- QuickJS eval error → dump error handle, dispose, return `{ error }`
- Exception thrown by `getQuickJS()` → propagate as `{ error }`
- `val` is `undefined`/`null` → omit `→` line from output

## Test Cases

1. `executeCode({ code: '1 + 1' })` → `{ output: '→ 2' }`
2. `executeCode({ code: 'console.log("hi"); 42' })` → `{ output: 'hi\n→ 42' }`
3. `executeCode({ code: 'throw new Error("boom")' })` → `{ error: /boom/ }`
4. `executeCode({ code: '' })` → `{ error: 'No code provided' }`
