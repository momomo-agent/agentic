# Design: Fix README — restore npm install agentic-lite

## File to Modify
- `README.md`

## Change
Remove the `⚠️ Renamed` section (lines referencing `agentic-core`) while keeping the existing `npm install agentic-lite` installation line.

## Before (current state)
```
# agentic-lite

## Installation
\`\`\`
npm install agentic-lite
\`\`\`

# ⚠️ Renamed — use agentic-core
agentic-lite has been renamed to [agentic-core](...).
\`\`\`bash
npm i agentic-core
\`\`\`
...
```

## After (target state)
```
# agentic-lite

## Installation
\`\`\`
npm install agentic-lite
\`\`\`
```

## Verification
- `grep 'npm install agentic-lite' README.md` → matches
- `grep 'agentic-core' README.md` → no matches
