# M6 DBB Check

**Match: 90%** | 2026-04-07T13:24:15.300Z

## Pass (11/12)
- DBB-005: mv directory — copyRecursive + rmRecursive implements directory move
- DBB-005: mv nonexistent returns error
- DBB-006: cp -r recursive copy — copyRecursive() implemented and tested
- DBB-006: cp -r deep nesting — test/cp-recursive tests cover 3+ levels
- DBB-006: cp -r nonexistent returns error
- DBB-006: cp without -r works for single file
- DBB-007: ls -a shows real dotfiles from fs
- DBB-007: ls without -a filters dotfiles
- DBB-008: echo > creates/overwrites file
- DBB-008: echo >> appends to file
- DBB-008: echo > readOnly returns Permission denied

## Fail (1/12)
- DBB-006: cp without -r on directory — no error returned; cp() reads the directory path via fs.read() instead of detecting it as a directory and returning an error
