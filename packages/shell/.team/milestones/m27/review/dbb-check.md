# DBB Check — Milestone m27

**Milestone**: Command Substitution & Remaining Vision Gaps
**Match**: 96%
**Date**: 2026-04-08

## Summary

20 of 21 criteria pass. Command substitution $(cmd) fully functional with nesting, error handling, env vars, multiple occurrences, pipes, and empty cases. Glob bracket expressions [abc], [a-z], [0-9], [!abc] all work. mkdir .keep fallback verified. All test suites pass.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| $(cmd) basic | pass | substituteCommands() lines 26-53 |
| $(cmd) with cat | pass | Inner exec correctly dispatches to cat |
| Nested $(cmd) depth 2-3 | pass | Line 27: `depth >= maxDepth` guard with maxDepth=3 |
| Failed inner → empty | pass | Line 41: `r.exitCode === 0 ? r.output.trim() : ''` |
| Env vars in cmd sub | pass | substituteEnv runs first (line 74), then substituteCommands |
| Multiple $(cmd) | pass | while loop (line 30) processes all `$(` occurrences |
| $(cmd) with pipe inside | pass | Inner exec handles pipe parsing via execPipeline |
| Empty $( ) | pass | Empty command returns '' output |
| $(cmd) surrounding text | pass | String concatenation at line 41 |
| Glob [abc] | pass | matchGlob lines 380-392 |
| Glob [a-z] | pass | Bracket content passes through to regex |
| Glob [0-9] | pass | Same regex pass-through |
| Glob [!abc] negation | pass | Line 385: converts `[!` to `[^` for regex negation |
| Glob bracket + * | pass | Both bracket and * handled in same matchGlob loop |
| Glob bracket in ls | pass | ls() calls expandGlob which calls matchGlob |
| Glob bracket empty | pass | expandGlob returns [] when no matches |
| mkdir .keep fallback | pass | mkdirOne() line 749: `fs.write(path + '/.keep', '')` |
| mkdir -p without fs.mkdir | pass | mkdir() recursive path calls mkdirOne for each segment |
| mkdir with fs.mkdir no regression | pass | mkdirOne() line 747: native mkdir when available |
| mkdir readOnly | pass | checkWritable() called in mkdir() line 756-757 |
| All m27 tests pass | pass | cmd-substitution-m21, bracket-glob-m21, mkdir-no-keep-fallback — all pass |
