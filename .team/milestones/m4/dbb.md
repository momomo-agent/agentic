# M4 Done-By-Definition (DBB)

## DBB-001: grep -i case-insensitive
- `grep -i "hello" file` matches lines containing "Hello", "HELLO", "hello"
- `-i` works in combination with `-l`, `-c`, `-r` flags
- `-i` works in pipe stdin mode (`execWithStdin`)
- Without `-i`, matching remains case-sensitive

## DBB-002: find recursive directory traversal
- `find /dir` returns entries from all subdirectories recursively
- `find /dir -name "*.ts"` matches files in nested subdirs
- `find /dir -type f` and `-type d` filters apply recursively
- Results include full paths (e.g. `/dir/sub/file.txt`)

## DBB-003: rm correctly deletes files
- `rm file.txt` calls `fs.delete` and file no longer exists
- `rm -r dir/` recursively deletes directory and contents
- `rm nonexistent` returns `rm: nonexistent: No such file or directory`

## DBB-004: resolve() normalizes `../` paths
- `resolve('../foo')` from `/a/b` returns `/a/foo`
- `resolve('../../foo')` from `/a/b/c` returns `/a/foo`
- `resolve('../..')` from `/a/b` returns `/`
- `resolve('a/../b')` returns `/cwd/b`
- Does not escape above root: `resolve('../../..')` from `/a` returns `/`
