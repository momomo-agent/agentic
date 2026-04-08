# Design: npm publish config + README install instructions

## Files to modify

### `package.json`
Add `publishConfig` field:
```json
"publishConfig": {
  "access": "public"
}
```

### `README.md`
Add Installation section near the top:
```md
## Installation
\`\`\`
npm install agentic-lite
\`\`\`
```

## Edge Cases
- `README.md` may not exist — create it if missing
- `package.json` already has `publishConfig` — update rather than duplicate

## Test Cases
- `cat package.json | grep publishConfig` returns a result
- `grep 'npm install agentic-lite' README.md` returns a result
