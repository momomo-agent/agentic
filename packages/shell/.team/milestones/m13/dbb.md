# M13 DBB — PRD Compliance & Test Coverage Gates

## grep -i Case-Insensitive Fix

### DBB-m13-001: grep -i works via fs.grep() path (multi-file)
- Given: files `/a.txt` ("Hello"), `/b.txt` ("world"); run `grep -i hello /a.txt /b.txt`
- Expect: output includes match from `/a.txt`, exit code 0

### DBB-m13-002: grep -i combined with -l
- Given: file `/a.txt` contains "Hello"; run `grep -il hello /a.txt`
- Expect: output is `/a.txt`, exit code 0

### DBB-m13-003: grep -i combined with -c
- Given: file `/a.txt` contains "Hello\nhello\nworld"; run `grep -ic hello /a.txt`
- Expect: output is `2`, exit code 0

### DBB-m13-004: grep -i no match
- Given: file `/a.txt` contains "world"; run `grep -i hello /a.txt`
- Expect: empty output, exit code 1

---

## wc Flag Support

### DBB-m13-005: wc -l returns only line count
- Given: file with 3 lines; run `wc -l /file.txt`
- Expect: output is `3`, no word/char counts

### DBB-m13-006: wc -w returns only word count
- Given: file with content "hello world foo"; run `wc -w /file.txt`
- Expect: output is `3`

### DBB-m13-007: wc -c returns only char count
- Given: file with content "abc"; run `wc -c /file.txt`
- Expect: output is `3`

### DBB-m13-008: wc with no flags returns full output
- Given: file with 2 lines, 3 words, 10 chars; run `wc /file.txt`
- Expect: output format `2\t3\t10\t/file.txt`

---

## touch Empty File Fix

### DBB-m13-009: touch on existing empty file preserves content
- Given: file `/empty.txt` exists with content `""`
- When: `touch /empty.txt`
- Expect: file still exists with empty content (not overwritten), exit code 0

### DBB-m13-010: touch on non-existent file creates it
- Given: `/new.txt` does not exist
- When: `touch /new.txt`
- Expect: file created with empty content, exit code 0

### DBB-m13-011: touch on existing non-empty file is no-op
- Given: `/data.txt` contains "hello"
- When: `touch /data.txt`
- Expect: content still "hello", exit code 0

---

## Coverage Gates

### DBB-m13-012: Statement coverage >= 80%
- Run `pnpm coverage` and verify statement coverage >= 80%

### DBB-m13-013: Branch coverage >= 75%
- Run `pnpm coverage` and verify branch coverage >= 75%

### DBB-m13-014: Test count >= 148
- Run `pnpm test` and verify >= 148 tests pass
