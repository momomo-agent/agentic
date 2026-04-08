# Fix mkdir error message format

## Progress

- Changed error format from `mkdir: cannot create directory 'X': No such file or directory` to `mkdir: X: No such file or directory`
- No existing tests referenced old format; all 4 mkdir tests pass
