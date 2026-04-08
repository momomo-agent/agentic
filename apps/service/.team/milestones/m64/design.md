# M64 Technical Design — Architecture Compliance: External Packages + Docs

## Approach

Four verification/fix tasks:

1. **agentic-store**: Check `package.json` deps, check `src/store/index.js` import. If local impl exists, replace with `require('agentic-store')` wrapper.

2. **agentic-embed**: Check `package.json` deps, check `src/runtime/embed.js` import. If local impl exists, replace with `require('agentic-embed')` wrapper.

3. **Detector extras**: `matcher.js` and `ollama.js` are not in ARCHITECTURE.md. Add `// Extension: <reason>` comment at top, or delete if unused.

4. **README**: Audit sections. Add any missing: install, usage, API reference, Docker, env vars.

## No new abstractions needed — all tasks are verification + minimal fixes.
