# Test Result: task-1775569348331

## Summary
- Tests passed: 1
- Tests failed: 2

## Test Results

| Test | Status |
|------|--------|
| agentic-sense dep uses file: reference | PASS |
| imports map has #agentic-sense alias | FAIL |
| #agentic-sense resolves to sense adapter | FAIL |

## Bug Found

`package.json` imports map is missing the `#agentic-sense` entry.

Current imports map:
```json
{
  "#agentic-embed": "./src/runtime/adapters/embed.js",
  "#agentic-voice": "./src/runtime/adapters/voice/openai-tts.js"
}
```

Required fix — add to imports:
```json
"#agentic-sense": "./src/runtime/adapters/sense.js"
```

The dependency `"agentic-sense": "file:./vendor/agentic-sense.tgz"` is correctly set.
Only the import map alias is missing.
