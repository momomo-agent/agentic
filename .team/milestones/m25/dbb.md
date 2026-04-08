# DBB — m25: PRD Feature Gaps: Env Vars, Glob & cp Fix

## Overview
Verification criteria for closing the remaining PRD feature gaps: environment variable substitution, recursive glob expansion, and cp error message format. Target: raise PRD match from ~83% (post-m24) toward >=90%.

## DBB Criteria

### Environment Variable Substitution (DBB-m25-env)

**DBB-m25-env-001**: Basic $VAR substitution
- Given: env contains HOME=/home/user
- When: echo $HOME
- Expect: output is /home/user

**DBB-m25-env-002**: ${VAR} bracket substitution
- Given: env contains HOME=/home/user
- When: echo ${HOME}/src
- Expect: output is /home/user/src

**DBB-m25-env-003**: Undefined variable expands to empty string
- Given: env does not contain UNDEFINED_VAR
- When: echo $UNDEFINED_VAR
- Expect: output is empty string

**DBB-m25-env-004**: Built-in PWD reflects cwd
- Given: no explicit PWD set
- When: cd /tmp then echo $PWD
- Expect: output is /tmp

**DBB-m25-env-005**: VAR=value assignment
- When: MYVAR=hello then echo $MYVAR
- Expect: output is hello
- Note: Assignment via = in command parsing — may need exec() pre-processing

**DBB-m25-env-006**: Variable substitution in pipe
- Given: env contains PAT=hello
- When: echo hello world | grep $PAT
- Expect: hello world in output

**DBB-m25-env-007**: Multiple variables in single command
- Given: env contains A=x and B=y
- When: echo $A $B
- Expect: output is x y

### Recursive Glob & Bracket Expressions (DBB-m25-glob)

**DBB-m25-glob-001**: **/*.ts matches files across subdirectories
- Given: /src/a.ts, /src/lib/b.ts, /src/lib/deep/c.ts
- When: cat **/*.ts
- Expect: all 3 .ts files are read

**DBB-m25-glob-002**: [abc] bracket expression matches character sets
- Given: files /a.txt, /b.txt, /c.txt, /d.txt
- When: cat [abc].txt
- Expect: reads a.txt, b.txt, c.txt but not d.txt

**DBB-m25-glob-003**: Combined **/[abc]*.ts pattern
- Given: /src/app.ts, /src/lib/alpha.ts, /src/lib/beta.js
- When: ls **/[ab]*.ts
- Expect: matches app.ts and alpha.ts

**DBB-m25-glob-004**: ** with no extension matches all files recursively
- Given: /a.txt, /sub/b.txt
- When: ls **/*
- Expect: matches both a.txt and sub/b.txt

**DBB-m25-glob-005**: find with glob pattern still works (no regression)
- Given: existing find tests pass
- When: find /dir -name "*.ts"
- Expect: same behavior as before

**DBB-m25-glob-006**: Empty glob result returns appropriate error
- Given: no files match **/*.xyz
- When: cat **/*.xyz
- Expect: cat: **/*.xyz: No such file or directory

### cp Without -r Error Message (DBB-m25-cp)

**DBB-m25-cp-001**: cp directory without -r returns UNIX-standard error
- Given: /mydir is a directory
- When: cp /mydir /dest
- Expect: cp: -r not specified; omitting directory /mydir or equivalent UNIX format
- Must NOT contain: is a directory (too generic)

**DBB-m25-cp-002**: cp -r on directory still works (no regression)
- Given: /mydir is a directory with files
- When: cp -r /mydir /dest
- Expect: directory copied successfully

**DBB-m25-cp-003**: cp file still works (no regression)
- Given: /file.txt exists
- When: cp /file.txt /copy.txt
- Expect: file copied successfully

## Verification Method
- Run npm test and confirm all tests pass
- Each DBB criterion maps to at least one test assertion
- env substitution verified by echo/cat with $VAR patterns
- glob verified by ls/cat with ** and [] patterns
- cp error format verified by assertion string check
