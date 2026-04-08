# Design: npx Entrypoint Verification

## Files
- `bin/agentic-service.js` (verify/fix)
- `package.json` (verify/fix `bin` field)

## Checks & Fixes

### package.json
Must contain:
```json
"bin": { "agentic-service": "bin/agentic-service.js" }
```

### bin/agentic-service.js
Must start with:
```js
#!/usr/bin/env node
```
Must import and call the server start, e.g.:
```js
import('../src/server/api.js').then(m => m.start?.())
```

## Verification
- `node bin/agentic-service.js` exits without immediate error
- Process listens on port 3000 (check with `curl http://localhost:3000/api/status`)

## Edge Cases
- Missing shebang → add it
- `bin` field missing or wrong path → fix in package.json
