# M9 DBB Check

**Match: 88%** | 2026-04-07T13:24:15.300Z

## Pass (13/14)
- cp -r recursive copy, error on nonexistent source
- echo > create/overwrite, echo >> append/create, readOnly error
- mv directory move, existing destination, error on nonexistent
- ls -a dotfiles, ls -a includes . and .., ls without -a hides dotfiles

## Fail (1/14)
- DBB-m9-003: cp without -r on directory — no error returned; implementation reads directory path via fs.read() silently instead of returning "requires -r" error
