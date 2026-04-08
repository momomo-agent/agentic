# Test Result — Glob pattern support in ls and grep

## Summary
- **Tests run**: 5 (glob-specific) + 205 (full suite)
- **Passed**: 205
- **Failed**: 0

## DBB Coverage

| DBB | Description | Result |
|-----|-------------|--------|
| DBB-m12-010 | `ls *.ts` lists only .ts files | PASS |
| DBB-m12-011 | `ls *.ts` no matches → error, exitCode 1 | PASS |
| DBB-m12-012 | `grep hello *.ts` searches only .ts files | PASS |
| DBB-m12-013 | `grep pattern *.ts` no matches → error, exitCode 1 | PASS |
| DBB-m12-014 | `ls a?.ts` single-char wildcard matches | PASS |

## Edge Cases
- No glob chars → passthrough (covered by existing tests)
- Glob matches dirs → excluded (filter `type === 'file'` in expandGlob)
- `?` matches exactly one character (abc.ts excluded from `a?.ts`)

## Verdict
All acceptance criteria met. Implementation is correct.
