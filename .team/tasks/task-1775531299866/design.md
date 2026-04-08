# Task Design: 添加测试套件

## Files to Create/Modify
- `src/index.test.ts` — new test file
- `package.json` — add vitest, test script, coverage config

## package.json changes

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

## Mock Strategy

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticShell } from './index'
import type { AgenticFileSystem } from 'agentic-filesystem'

function makeMockFs(overrides = {}): AgenticFileSystem {
  return {
    ls: vi.fn().mockResolvedValue([]),
    read: vi.fn().mockResolvedValue({ content: '', error: null }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    grep: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AgenticFileSystem
}
```

## Test Coverage Plan

| Command | Test cases |
|---------|-----------|
| ls | basic list, -a hidden, -l long format |
| cat | single file, multi-file, missing file error |
| grep | basic match, -r recursive, -l files only, -c count, no match |
| find | -name glob, -type f, -type d |
| pwd | returns cwd |
| cd | changes cwd, ~ resets to / |
| mkdir | creates .keep file |
| rm | calls delete |
| mv | read+write+delete |
| cp | read+write |
| echo | joins args |
| touch | creates empty file |
| head | first N lines |
| tail | last N lines |
| wc | line/word/char count |
| pipe | cat\|grep, echo\|grep |
| boundary | empty file, special chars in filename, path with ../ |

## Edge Cases (DBB-015, DBB-016, DBB-017)
- Empty file: `cat empty.txt` → `''`
- Space in filename: `cat "hello world.txt"` → content
- Path with `../`: `cat ./sub/../file.txt` → content (resolve handles this — note: current `resolve()` does NOT normalize `..`, may need fix or test to document behavior)
