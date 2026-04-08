# M11 DBB Check

**Match: 85%** | 2026-04-07T13:24:15.300Z

## Pass (11/13)
- cp -r copies directory tree, destination merge, error on nonexistent source
- mv moves directory, existing destination, error on nonexistent source
- echo > create/overwrite, echo >> append/create, readOnly error
- ARCHITECTURE.md exists at repo root

## Fail/Partial (2/13)
- DBB-m11-004: cp without -r on directory — no error returned; cp() does not detect directory and return "requires -r" error
- DBB-m11-013: ARCHITECTURE.md covers required topics — file exists but content not verified for all four required sections
