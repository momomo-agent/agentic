# DBB Check — Milestone m23

**Milestone**: Test Failures & Spec Alignment
**Match**: 100%
**Date**: 2026-04-08

## Summary

All 9 criteria pass. Pipe error propagation handles multi-line errors correctly (first line only). Legitimate output not treated as error. cp directory without -r returns standard UNIX format without "(use -r)" suffix. wc -l/-w/-c all return tab-separated format. 515/515 functional tests pass (architecture-alignment excluded as m28-specific).

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Pipe multi-line error first line | pass | isErrorOutput() line 337: `/^\w[\w-]*: .+: .+/` checks `split('\n')[0]` only |
| Legitimate output not error | pass | isErrorOutput requires first line to match `word: path: reason` pattern |
| Pipe 3-stage works | pass | pipe-3stage-exitcode-m15.test.ts passes |
| Whitespace-prefixed not error | pass | isErrorOutput regex starts with `^\w` — whitespace prefix doesn't match |
| cp dir without -r standard format | pass | Line 894: `cp: ${src}: -r not specified; omitting directory` |
| cp no "(use -r)" suffix | pass | cp-error.test.ts: `expect(output).not.toContain('is a directory')` |
| wc -l tab format | pass | Line 966: `${lines}\t${path}` |
| wc -w tab format | pass | Line 967: `${words}\t${path}` |
| wc -c tab format | pass | Line 968: `${chars}\t${path}` |
