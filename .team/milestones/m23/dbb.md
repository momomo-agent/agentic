# DBB — m23: Test Failures & Spec Alignment

## Overview
Verification criteria for fixing 8 remaining test failures across 3 test files to bring pass rate from 321/329 to 329/329.

## DBB Criteria

### Pipe Error Propagation (DBB-m23-pipe)

**DBB-m23-pipe-001**: Multi-line error output in pipe — only first line checked
- Given: `nonexistent_cmd arg1 | grep pattern`
- When: the left command produces a multi-line error (e.g. "command not found\nextra info")
- Expect: only the first line is checked for error detection; pipe continues with empty stdin for grep
- Test file: `test/pipe-error-edge-cases.test.ts`

**DBB-m23-pipe-002**: Legitimate output matching error pattern not treated as error
- Given: `cat /some/file | grep "error: something"`
- When: the left command produces normal output that happens to contain error-like text
- Expect: output is passed as stdin to grep normally (not treated as a pipe error)
- Test file: `test/pipe-error-edge-cases.test.ts`

**DBB-m23-pipe-003**: Error from first command in 3-stage pipe propagates correctly
- Given: `nonexistent_cmd | grep foo | wc -l`
- When: the first command fails
- Expect: empty stdin flows through all stages; result is `0` (not short-circuited)
- Test file: `test/pipe-error-edge-cases.test.ts`

**DBB-m23-pipe-004**: Whitespace-prefixed error lines not treated as errors
- Given: `cat /file | grep pattern` where left command output starts with spaces
- Expect: output with leading whitespace is normal output, not an error
- Test file: `test/pipe-error-edge-cases.test.ts`

### cp Directory Without -r (DBB-m23-cp)

**DBB-m23-cp-001**: cp on directory without -r returns standard error
- Given: `/mydir` is a directory, no `-r` flag
- When: `cp /mydir /dest`
- Expect: `cp: /mydir: is a directory` (exit code 1)
- Must NOT contain `(use -r)` suffix

**DBB-m23-cp-002**: Error message does not contain "(use -r)"
- Given: same as above
- When: checking the error string
- Expect: string does NOT include `(use -r)` substring
- Standard UNIX cp does not include hints

### wc Flag Output Format (DBB-m23-wc)

**DBB-m23-wc-001**: wc -l returns count with tab + filename
- Given: file `/f.txt` with content `a\nb\nc`
- When: `wc -l /f.txt`
- Expect: `3\t/f.txt` (count + tab + filename)

**DBB-m23-wc-002**: wc -l returns 0 with filename for empty file
- Given: empty file `/empty.txt`
- When: `wc -l /empty.txt`
- Expect: `0\t/empty.txt`

**DBB-m23-wc-003**: wc -w returns word count with tab + filename
- Given: file with content `hello world`
- When: `wc -w /f.txt`
- Expect: `2\t/f.txt`

**DBB-m23-wc-004**: wc -c returns char count with tab + filename
- Given: file with content `abc`
- When: `wc -c /f.txt`
- Expect: `3\t/f.txt`

## Verification Method
- Run `npm test` and confirm 329/329 passing (excluding OOM test files)
- Each DBB criterion maps to an existing test assertion
