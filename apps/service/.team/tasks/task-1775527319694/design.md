# Design: Unspecified Detector Files — matcher.js + ollama.js

## Files
- `src/detector/matcher.js`
- `src/detector/ollama.js`

## Options
1. Remove if functionality is covered by hardware.js / profiles.js
2. Keep and add top-of-file comment:
   ```js
   // Extension: not in ARCHITECTURE.md spec. Handles <reason>.
   ```

## Decision Rule
- If exported functions are called by other modules → keep + document
- If unused → delete
