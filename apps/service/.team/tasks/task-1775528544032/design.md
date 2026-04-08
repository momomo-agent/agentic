# Design: npx entrypoint verification

## Files
- `bin/agentic-service.js` — must have `#!/usr/bin/env node` on line 1
- `package.json` — `"bin": { "agentic-service": "bin/agentic-service.js" }`

## Verification steps
1. Confirm shebang present
2. Confirm file is executable (`ls -la bin/`)
3. Run `node bin/agentic-service.js --help` — must print usage without error

## No code changes expected — verify only.
