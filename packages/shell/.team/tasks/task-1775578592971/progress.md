# Fix rm -r deep nesting stack overflow

## Progress

- Replaced recursive rmRecursive with iterative post-order traversal using explicit stack + visited set
- Cycle detection via visited Set prevents infinite loops
- All rm-recursive tests pass
- Note: mkdir-find-cd.test.ts has pre-existing OOM from findRecursive infinite recursion (mock always returns same entries including dirs) — unrelated to this task
