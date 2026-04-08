# M6 Done-By-Definition (DBB)

## DBB-005: mv directory support
- `mv /dir1 /dir2` successfully moves directory and all contents
- `mv /a/b /c/d` moves nested directory to new location
- After `mv /src /dst`, `ls /src` returns error, `ls /dst` shows original contents
- `mv /file.txt /dir/` moves file into directory (if dst ends with `/`)
- `mv /nonexistent /dst` returns `mv: /nonexistent: No such file or directory`

## DBB-006: cp -r recursive directory copy
- `cp -r /dir1 /dir2` copies directory tree recursively
- `cp -r /a/b /c/d` copies nested directory with all subdirectories and files
- After `cp -r /src /dst`, both `/src` and `/dst` exist with identical structure
- `cp /file.txt /dst` (without -r) still works for single file copy
- `cp -r /nonexistent /dst` returns `cp: /nonexistent: No such file or directory`
- `cp -r` handles deep nesting (3+ levels) correctly

## DBB-007: ls -a real hidden files
- `ls -a /dir` includes files starting with `.` from fs (e.g., `.gitignore`, `.env`)
- `ls -a` still includes synthetic `.` and `..` entries
- `ls /dir` (without -a) filters out hidden files starting with `.`
- Hidden files appear in correct alphabetical order with other entries

## DBB-008: echo output redirection
- `echo "hello" > /file.txt` creates file with content "hello\n"
- `echo "world" >> /file.txt` appends "world\n" to existing file
- `echo "test" > /new/path/file.txt` returns error if parent directory doesn't exist
- `echo "data" > /file.txt` overwrites existing file content
- `echo "line1" > /f.txt` then `echo "line2" >> /f.txt` results in "line1\nline2\n"
- Redirection respects readOnly filesystem (returns Permission denied)
