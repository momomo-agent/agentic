# Design: Fix org name mismatch in DBB tests

## File to modify
- `src/detector/profiles.js`

## Change
Line 6 — update `PROFILES_URL`:
```js
// Before:
const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json';

// After:
const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momo-ai/agentic-service/main/profiles/default.json';
