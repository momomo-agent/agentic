# M2 DBB — Command Completeness & Permissions

## DBB-001: rm -r deletes directory recursively
- Given: a directory `/tmp/dir` with nested files
- Run: `rm -r /tmp/dir`
- Expect: all files and the directory are deleted, exit code 0

## DBB-002: rm -r safety — refuses root
- Given: `rm -r /`
- Expect: error message "rm: refusing to remove '/'", no deletion, exit code non-zero

## DBB-003: rm without -r on directory
- Given: a directory `/tmp/dir`
- Run: `rm /tmp/dir`
- Expect: error `rm: /tmp/dir: is a directory`, exit code non-zero

## DBB-004: readOnly — write blocked
- Given: filesystem in readOnly mode
- Run: `touch /file.txt`
- Expect: error `touch: /file.txt: Permission denied`, exit code non-zero

## DBB-005: readOnly — all write commands blocked
- Given: filesystem in readOnly mode
- Run each of: `write`, `mkdir`, `rm`, `mv`, `cp`, `touch`
- Expect: each returns `Permission denied` error

## DBB-006: readOnly — read commands unaffected
- Given: filesystem in readOnly mode
- Run: `cat /file.txt`, `ls /`, `grep pattern /file.txt`
- Expect: normal output, no permission error

## DBB-007: cd to non-existent directory
- Given: `/no/such/dir` does not exist
- Run: `cd /no/such/dir`
- Expect: error `cd: /no/such/dir: No such file or directory`, cwd unchanged

## DBB-008: cd to a file (not a directory)
- Given: `/file.txt` is a file
- Run: `cd /file.txt`
- Expect: error `cd: /file.txt: Not a directory`, cwd unchanged

## DBB-009: cd to valid directory
- Given: `/subdir` exists as a directory
- Run: `cd /subdir`
- Expect: cwd updated to `/subdir`, no error

## DBB-010: mkdir creates directory natively
- Given: `/newdir` does not exist
- Run: `mkdir /newdir`
- Expect: `ls /newdir` succeeds (no .keep workaround visible), exit code 0

## DBB-011: mkdir -p creates nested directories
- Given: `/a/b/c` does not exist
- Run: `mkdir -p /a/b/c`
- Expect: all intermediate directories created, exit code 0

## DBB-012: mkdir without -p fails if parent missing
- Given: `/a/b` does not exist
- Run: `mkdir /a/b/c`
- Expect: error `mkdir: /a/b/c: No such file or directory`, exit code non-zero

## DBB-013: find -type f returns only files
- Given: directory with mixed files and subdirectories
- Run: `find /dir -type f`
- Expect: output contains only file entries (no trailing `/`)

## DBB-014: find -type d returns only directories
- Given: directory with mixed files and subdirectories
- Run: `find /dir -type d`
- Expect: output contains only directory entries

## DBB-015: find without -type returns all entries
- Given: directory with mixed entries
- Run: `find /dir`
- Expect: all entries returned regardless of type
