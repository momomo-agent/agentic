# npx Entrypoint Verification + Fix — Technical Design

## Files to Modify
- `package.json` — verify `bin` field points to correct path
- `bin/agentic-service.js` — verify shebang and entry logic

## Checks
```json
// package.json must have:
{
  "bin": { "agentic-service": "./bin/agentic-service.js" },
  "type": "module"
}
```

```js
// bin/agentic-service.js must start with:
#!/usr/bin/env node
```

## Algorithm
1. Read `package.json` — confirm `bin` entry exists and path is correct
2. Read `bin/agentic-service.js` — confirm `#!/usr/bin/env node` shebang on line 1
3. Confirm file is executable: `chmod +x bin/agentic-service.js` if needed
4. Verify `main` field in `package.json` is not conflicting
5. Test: `node bin/agentic-service.js --help` exits cleanly

## Edge Cases
- Missing shebang → add it as first line
- `"type": "module"` missing → add it (required for ESM imports)
- `bin` path uses backslashes on Windows → use forward slashes

## Test Cases
- `npx agentic-service --help` prints usage without error on fresh install
- `node bin/agentic-service.js` starts server or prints help
