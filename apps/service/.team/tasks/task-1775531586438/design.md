# Design: Verify npx Entrypoint

## Files
- `package.json` — verify `"bin": {"agentic-service": "bin/agentic-service.js"}`
- `bin/agentic-service.js` — verify `#!/usr/bin/env node` shebang on line 1

## Verification Steps
1. Check `package.json` bin field exists and points to `bin/agentic-service.js`
2. Check shebang line in `bin/agentic-service.js`
3. Run `node bin/agentic-service.js --version` to confirm no import errors

## No Code Changes Expected
Both are already in place. This is a verification task — fix only if broken.

## Fix If Needed
- Missing bin: add `"bin": {"agentic-service": "bin/agentic-service.js"}` to `package.json`
- Missing shebang: add `#!/usr/bin/env node` as first line of `bin/agentic-service.js`
