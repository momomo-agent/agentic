# Design: Verify and fix npx bin entrypoint

## Files to check/modify
- `bin/agentic-service.js` — must have `#!/usr/bin/env node` on line 1
- `package.json` — `bin` field must be `{ "agentic-service": "bin/agentic-service.js" }`

## Steps
1. Read `bin/agentic-service.js` line 1 — confirm shebang `#!/usr/bin/env node`
2. Read `package.json` `bin` field — confirm value is `"bin/agentic-service.js"`
3. Run `node bin/agentic-service.js --help` — must exit 0 with no import errors
4. If shebang missing, prepend it; if bin field wrong, correct it

## Edge cases
- File must be executable: `chmod +x bin/agentic-service.js`
- All `import` paths inside the bin file must resolve (no broken relative paths)

## Test cases
- `node bin/agentic-service.js --help` exits with code 0
- No `ERR_MODULE_NOT_FOUND` or `SyntaxError` on startup
