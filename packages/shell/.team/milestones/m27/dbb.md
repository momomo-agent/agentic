# DBB — m27: Command Substitution & Remaining Vision Gaps

## Overview
Verification criteria for closing remaining vision gaps: command substitution $(cmd), glob bracket expressions [abc], and mkdir fallback workaround. Target: push Vision match from ~91% to ≥93%.

## DBB Criteria

### Command Substitution (DBB-m27-cmdsub)

**DBB-m27-cmdsub-001**: Basic $(cmd) substitution
- Given: shell with cwd=/tmp
- When: echo $(pwd)
- Expect: output is /tmp

**DBB-m27-cmdsub-002**: Command substitution with cat
- Given: /hello.txt contains "world"
- When: cat $(echo hello.txt)
- Expect: output is world

**DBB-m27-cmdsub-003**: Nested substitution depth 2
- When: echo $(echo $(echo nested))
- Expect: output is nested

**DBB-m27-cmdsub-004**: Nested substitution depth 3
- When: echo $(echo $(echo $(echo deep)))
- Expect: output is deep

**DBB-m27-cmdsub-005**: Failed inner command expands to empty
- When: echo before$(nonexistent)after
- Expect: output is beforeafter (empty substitution on error)

**DBB-m27-cmdsub-006**: Command substitution with environment variables
- Given: env contains GREET=hello
- When: echo $(echo $GREET)
- Expect: output is hello

**DBB-m27-cmdsub-007**: Multiple substitutions in one command
- When: echo $(echo a) $(echo b) $(echo c)
- Expect: output is a b c

**DBB-m27-cmdsub-008**: Substitution with pipe inside
- When: echo $(echo "hello world" | grep hello)
- Expect: output is hello world

**DBB-m27-cmdsub-009**: Empty command substitution
- When: echo $(echo "")
- Expect: output is empty string

**DBB-m27-cmdsub-010**: Substitution preserves surrounding text
- When: echo prefix$(echo middle)suffix
- Expect: output is prefixmiddlesuffix

### Glob Bracket Expressions (DBB-m27-glob)

**DBB-m27-glob-001**: [abc] matches character set
- Given: files /a.txt, /b.txt, /c.txt, /d.txt
- When: cat [abc].txt
- Expect: reads a.txt, b.txt, c.txt but not d.txt

**DBB-m27-glob-002**: [a-z] range matches
- Given: files /a.txt, /m.txt, /z.txt, /5.txt
- When: cat [a-z].txt
- Expect: reads a.txt, m.txt, z.txt but not 5.txt

**DBB-m27-glob-003**: [0-9] digit range
- Given: files /1.txt, /5.txt, /a.txt
- When: cat [0-9].txt
- Expect: reads 1.txt, 5.txt but not a.txt

**DBB-m27-glob-004**: [!abc] negated bracket
- Given: files /a.txt, /b.txt, /d.txt
- When: cat [!abc].txt
- Expect: reads d.txt only

**DBB-m27-glob-005**: Bracket combined with *
- Given: files /alpha.txt, /beta.txt, /gamma.txt
- When: cat [ab]*.txt
- Expect: reads alpha.txt, beta.txt but not gamma.txt

**DBB-m27-glob-006**: Bracket in ls command
- Given: files /foo1.log, /foo2.log, /fooa.log
- When: ls [0-9]*
- Expect: matches foo1.log, foo2.log (not fooa.log when only numeric expansion needed)

**DBB-m27-glob-007**: Empty bracket result returns error
- Given: no files match [xyz].txt
- When: cat [xyz].txt
- Expect: cat: [xyz].txt: No such file or directory

### mkdir Fallback Workaround (DBB-m27-mkdir)

**DBB-m27-mkdir-001**: mkdir works without fs.mkdir (uses .keep fallback)
- Given: MockFS with no mkdir method
- When: mkdir /newdir
- Expect: /newdir/.keep is written (no error)

**DBB-m27-mkdir-002**: mkdir -p works without fs.mkdir
- Given: MockFS with no mkdir method
- When: mkdir -p /a/b/c
- Expect: /a/b/.keep and /a/b/c/.keep are written (no error)

**DBB-m27-mkdir-003**: mkdir with fs.mkdir still works (no regression)
- Given: MockFS with mkdir method
- When: mkdir /newdir
- Expect: fs.mkdir is called

**DBB-m27-mkdir-004**: mkdir fallback with readOnly returns permission error
- Given: MockFS with readOnly=true and no mkdir
- When: mkdir /newdir
- Expect: mkdir: /newdir: Permission denied

## Verification Method
- Run npm test and confirm all tests pass
- Each DBB criterion maps to at least one test assertion
- Command substitution verified via echo/cat/pwd with $(...) patterns
- Glob verified via ls/cat with [abc] and [a-z] patterns
- mkdir fallback verified with mock FS that omits mkdir method
