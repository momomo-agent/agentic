# DBB — m21: Shell Scripting Foundations

## task-1775582074220: $VAR environment variable substitution
- [ ] `setEnv('X', 'hello')` then `exec('echo $X')` → `{ output: 'hello', exitCode: 0 }`
- [ ] `exec('echo ${X}')` → same result as `$X`
- [ ] Undefined var → empty string: `exec('echo $UNDEF')` → `{ output: '', exitCode: 0 }`
- [ ] Substitution before pipe: `exec('echo $X | grep hello')` works correctly
- [ ] Multiple vars: `exec('echo $A $B')` returns both values

## task-1775582079663: $(cmd) command substitution
- [ ] `exec('echo $(pwd)')` returns cwd
- [ ] `exec('echo $(echo hi)')` → `{ output: 'hi', exitCode: 0 }`
- [ ] Multiple substitutions: `exec('echo $(echo a) $(echo b)')` → `'a b'`
- [ ] Substitution occurs before pipe splitting
- [ ] Failed inner command result spliced as-is

## task-1775582087197: Bracket glob [abc] support
- [ ] `matchGlob('a', '[abc]')` → true; `matchGlob('d', '[abc]')` → false
- [ ] `matchGlob('b', '[a-z]')` → true; `matchGlob('B', '[a-z]')` → false
- [ ] `expandGlob('file[12].txt', dir)` matches `file1.txt` and `file2.txt`
- [ ] `exec('ls [abc]*')` lists only matching files
- [ ] `expandGlob` triggers on `[` in pattern

## Coverage Gate
- All 3 tasks have ≥ 3 passing tests each
- No regressions in existing suite
