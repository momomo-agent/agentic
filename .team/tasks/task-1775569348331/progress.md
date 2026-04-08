# Wire agentic-sense as external package dependency

## Progress

- `package.json` already had `"agentic-sense": "file:./vendor/agentic-sense.tgz"` in dependencies
- Added `"#agentic-sense": "./src/runtime/adapters/sense.js"` to the `imports` map
