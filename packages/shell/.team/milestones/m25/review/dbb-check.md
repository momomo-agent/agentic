# DBB Check — Milestone m25

**Milestone**: PRD Feature Gaps: Env Vars, Glob & cp Fix
**Match**: 100%
**Date**: 2026-04-08

## Summary

All 16 criteria pass. Environment variable substitution ($VAR, ${VAR}, undefined→empty, PWD tracking, VAR=value assignment, pipe context, multiple vars). Recursive glob (**/*.ts, [abc], combined patterns). cp without -r error format confirmed.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| $VAR substitution | pass | substituteEnv() line 23 |
| ${VAR} substitution | pass | substituteEnv() line 22 |
| Undefined var → empty | pass | `?? ''` fallback on lines 22-23 |
| PWD tracked on cd | pass | Line 735: `this.env.set('PWD', resolved)` |
| VAR=value assignment | pass | execPipeline lines 95-98 |
| Env vars in pipe | pass | substituteEnv runs before pipe parsing (line 74) |
| Multiple vars | pass | Regex replace handles all occurrences |
| Recursive glob **/*.ts | pass | expandGlob lines 436-443 → expandRecursiveGlob |
| Bracket glob [abc] | pass | matchGlob lines 380-392 |
| Combined **/[abc]*.ts | pass | Both ** and [abc] handled by same pipeline |
| **/* matches all | pass | expandRecursiveGlob with pattern '*' |
| Glob no regression | pass | Single-dir glob (lines 446-450) unchanged |
| Glob empty result → error | pass | Line 480: `ls: ${pathArg}: No such file or directory` |
| cp without -r UNIX error | pass | Line 894: `cp: ${src}: -r not specified; omitting directory` |
| cp -r no regression | pass | copyRecursive() lines 901-923 works correctly |
| cp file no regression | pass | Lines 895-898: normal file copy path unchanged |
