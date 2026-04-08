# Design: Document Pyodide CDN dependency in README

## Files to Modify
- `README.md`

## Approach

Add a new section under the `code_exec` documentation explaining the CDN dependency and providing actionable workarounds.

## Content to Add

Insert after the existing `code_exec` usage example:

```markdown
### Python execution and Pyodide

`code_exec` runs Python in the browser via [Pyodide](https://pyodide.org), which is loaded dynamically from CDN (`https://cdn.jsdelivr.net/pyodide/...`).

**Limitations:**
- Requires network access to the CDN on first use
- Blocked in environments with strict CSP or no internet access

**Workarounds:**
- **Self-host Pyodide**: Download the Pyodide distribution and serve it from your own origin. Set the `indexURL` option if the `code_exec` tool exposes it, or patch the dynamic import URL before bundling.
- **Disable Python**: Omit `'code'` from `config.tools` to skip `code_exec` entirely when CDN access is unavailable.
```

## Edge Cases
- No code changes required; this is documentation only.
- Exact placement: after `code_exec` tool description, before the next section.

## Test Cases (DBB verification)
1. README contains the word "Pyodide" and a CDN URL reference — DBB-005 passes.
2. README contains at least one actionable workaround (self-hosting or disabling) — DBB-006 passes.
