# m17 — Done-By-Definition (DBB)

## Verification Criteria

### 1. Glob Pattern Expansion
- [ ] `ls *.ts` returns all `.ts` files in cwd
- [ ] `cat *.txt` concatenates all matching files
- [ ] `rm *.log` removes all matching files
- [ ] `cp *.md /dest/` copies all matching files
- [ ] No-match glob returns `ls: *.xyz: No such file or directory`
- [ ] Non-glob args are unaffected

### 2. cp without -r on directory
- [ ] `cp dir/ dest` returns `cp: dir/: is a directory` (no `-r` suffix)
- [ ] `cp -r dir/ dest` still works correctly
- [ ] Error message matches UNIX format: `cp: <path>: is a directory`

### 3. Input Redirection (`<`)
- [ ] `grep pattern < file.txt` reads file and filters lines
- [ ] `wc < file.txt` counts lines/words/chars from file content
- [ ] `grep pattern < nonexistent` returns `bash: nonexistent: No such file or directory` with exitCode 1
- [ ] Combined `cmd < infile > outfile` works correctly
- [ ] Already-implemented `<` in exec() is verified by tests

## Test Count Gate
- Total tests ≥ 155 (adds ~7 new tests across 3 tasks)

## Coverage Gate
- Statement coverage ≥ 80%
- Branch coverage ≥ 75%
