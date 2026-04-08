# M8 DBB Check

**Match: 88%** | 2026-04-07T13:24:15.300Z

## Pass (18/20)
- cp -r recursive copy, deep nesting, error on nonexistent source
- echo > overwrite, create, readOnly error
- echo >> append, create if missing
- mv directory: move, rename, overwrite, error on nonexistent
- ls -a dotfiles, ls without -a hides dotfiles, ls -a includes . and ..
- Dedicated pagination tests (test/ls-pagination.test.ts)
- Dedicated streaming tests (test/grep-streaming.test.ts)
- ARCHITECTURE.md exists at repo root

## Partial (2/20)
- DBB-m8-019: ARCHITECTURE.md design decisions — file exists but content not fully verified for all 5 required sections
- DBB-m8-020: ARCHITECTURE.md readability — not verified by reading content
