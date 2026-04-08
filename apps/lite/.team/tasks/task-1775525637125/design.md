# Design: code tool — browser-compatible AsyncFunction

## File
`src/tools/code.ts`

## Analysis
Already uses `new Function('console', 'return (async () => { ... })()')` pattern — no Node deps.

## Verification
- Confirm no `import vm` or `require('vm')` or `child_process` in code.ts
- Confirm async code (e.g. `await Promise.resolve(42)`) executes without error

## Function Signature (unchanged)
```ts
executeCode(input: Record<string, unknown>): Promise<CodeResult>
```

## Edge Cases
- Empty code string → `{ error: 'No code provided' }`
- Code throws → `{ error: String(err), output: logs }`
- Async code with `await` → works via AsyncFunction wrapper

## Test Cases (DBB-009, DBB-010, DBB-011)
- `console.log("hello")` → output includes "hello"
- `await Promise.resolve(42)` → no error, result includes "42"
- `throw new Error("oops")` → error includes "oops", no throw from executeCode
