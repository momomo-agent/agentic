# DBB — m15: Exit Code Edge Cases & Stdin No-Match

## Verification Criteria

### 1. exitCode 2 vs 127 distinction
- `exec('cat')` → `{ exitCode: 2 }` (missing operand)
- `exec('rm')` → `{ exitCode: 2 }` (missing operand)
- `exec('grep')` → `{ exitCode: 2 }` (missing pattern)
- `exec('foobar')` → `{ exitCode: 127 }` (command not found)
- `exec('xyz arg')` → `{ exitCode: 127 }` (unknown command with args)

### 2. grep stdin no-match exitCode 1
- `exec('cat file | grep nomatch')` → `{ output: '', exitCode: 1 }`
- `exec('grep pattern < file')` with no match → `{ exitCode: 1 }`
- `exec('cat file | grep match')` with match → `{ exitCode: 0 }`

### 3. Output redirection with error source
- `exec('cat /missing > /out.txt')` → `{ exitCode: 1 }`, `/out.txt` NOT created
- `exec('cat /missing >> /out.txt')` → `{ exitCode: 1 }`, `/out.txt` NOT created/modified
- `exec('cat /existing > /out.txt')` → `{ exitCode: 0 }`, `/out.txt` created

### 4. 3+ stage pipe exit code propagation
- `exec('cat file | grep match | grep nomatch')` → `{ exitCode: 1 }`
- `exec('cat file | grep match | grep match2')` with match → `{ exitCode: 0 }`
- Middle stage failure propagates to final exitCode
