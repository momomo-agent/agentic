# Task Design: Add Node.js filesystem integration tests

## File to Create

`test/node-fs-integration.test.ts`

## Problem

Vision gap analysis flagged: "Cross-environment consistency tests use mock backends only — no real browser/Electron/Node.js filesystem integration tests exist." This is a **major** severity gap.

## Approach

Create a `NodeFsAdapter` class that wraps Node.js native `fs` module to implement the `AgenticFileSystem` interface. Use a real temp directory for tests. This validates that `AgenticShell` works correctly against a real filesystem, not just mocks.

## Files to Create/Modify

| File | Action |
|------|--------|
| `test/node-fs-integration.test.ts` | Create — integration tests + NodeFsAdapter |

## NodeFsAdapter Implementation

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem } from 'agentic-filesystem'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

class NodeFsAdapter implements AgenticFileSystem {
  constructor(private root: string) {}

  private abs(p: string): string {
    // Convert shell absolute path (/foo/bar) to real path (root/foo/bar)
    const relative = p.startsWith('/') ? p.slice(1) : p
    return path.join(this.root, relative)
  }

  async ls(dirPath: string): Promise<Array<{ name: string; type: 'file' | 'dir' }>> {
    const realPath = this.abs(dirPath)
    try {
      const entries = await fs.promises.readdir(realPath, { withFileTypes: true })
      return entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file'
      }))
    } catch {
      throw new Error(`ls: ${dirPath}: No such file or directory`)
    }
  }

  async read(filePath: string): Promise<{ content?: string; error?: string }> {
    const realPath = this.abs(filePath)
    try {
      const content = await fs.promises.readFile(realPath, 'utf-8')
      return { content }
    } catch {
      return { error: `${filePath}: No such file or directory` }
    }
  }

  async write(filePath: string, content: string): Promise<void> {
    const realPath = this.abs(filePath)
    const dir = path.dirname(realPath)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(realPath, content, 'utf-8')
  }

  async delete(filePath: string): Promise<void> {
    const realPath = this.abs(filePath)
    try {
      const stat = await fs.promises.stat(realPath)
      if (stat.isDirectory()) {
        await fs.promises.rm(realPath, { recursive: true })
      } else {
        await fs.promises.unlink(realPath)
      }
    } catch {
      throw new Error(`rm: ${filePath}: No such file or directory`)
    }
  }

  async grep(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> {
    const results: Array<{ path: string; line: number; content: string }> = []
    const regex = new RegExp(pattern)

    const walk = async (dir: string, prefix: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const shellPath = prefix + '/' + entry.name
        if (entry.isDirectory()) {
          await walk(fullPath, shellPath)
        } else if (entry.isFile()) {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8')
            const lines = content.split('\n')
            lines.forEach((line, i) => {
              if (regex.test(line)) {
                results.push({ path: shellPath, line: i + 1, content: line })
              }
            })
          } catch { /* skip unreadable files */ }
        }
      }
    }

    await walk(this.root, '')
    return results
  }

  async mkdir(dirPath: string): Promise<void> {
    const realPath = this.abs(dirPath)
    await fs.promises.mkdir(realPath, { recursive: true })
  }
}
```

## Test Structure

```typescript
describe('Node.js filesystem integration', () => {
  let tmpDir: string
  let shell: AgenticShell

  beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agentic-shell-test-'))
    const adapter = new NodeFsAdapter(tmpDir)
    shell = new AgenticShell(adapter)
  })

  afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  })

  // Command tests...
})
```

## Test Cases

### ls command
```typescript
it('ls lists real directory contents', async () => {
  await shell.exec('mkdir /subdir')
  await shell.exec('echo hello > /file.txt')
  const result = await shell.exec('ls /')
  expect(result.output).toContain('file.txt')
  expect(result.output).toContain('subdir')
  expect(result.exitCode).toBe(0)
})

it('ls on non-existent directory returns error', async () => {
  const result = await shell.exec('ls /nonexistent')
  expect(result.exitCode).not.toBe(0)
  expect(result.output).toContain('No such file or directory')
})
```

### cat command
```typescript
it('cat reads real file contents', async () => {
  await shell.exec('echo test content > /readme.txt')
  const result = await shell.exec('cat /readme.txt')
  expect(result.output.trim()).toBe('test content')
  expect(result.exitCode).toBe(0)
})

it('cat non-existent file returns error', async () => {
  const result = await shell.exec('cat /ghost.txt')
  expect(result.exitCode).not.toBe(0)
  expect(result.output).toContain('No such file or directory')
})
```

### grep command
```typescript
it('grep finds matches in real files', async () => {
  await shell.exec('echo "hello world" > /grepme.txt')
  await shell.exec('echo "goodbye world" >> /grepme.txt')
  const result = await shell.exec('grep "hello" /grepme.txt')
  expect(result.output).toContain('hello world')
  expect(result.exitCode).toBe(0)
})

it('grep no-match returns exit code 1', async () => {
  await shell.exec('echo "hello" > /grepme2.txt')
  const result = await shell.exec('grep "xyz" /grepme2.txt')
  expect(result.output).toBe('')
  expect(result.exitCode).toBe(1)
})
```

### mkdir command
```typescript
it('mkdir creates real directory', async () => {
  const result = await shell.exec('mkdir /newdir')
  expect(result.exitCode).toBe(0)
  const stat = await fs.promises.stat(path.join(tmpDir, 'newdir'))
  expect(stat.isDirectory()).toBe(true)
})
```

### rm command
```typescript
it('rm removes real file', async () => {
  await shell.exec('echo temp > /tempfile.txt')
  await shell.exec('rm /tempfile.txt')
  const result = await shell.exec('cat /tempfile.txt')
  expect(result.exitCode).not.toBe(0)
})

it('rm -r removes real directory', async () => {
  await shell.exec('mkdir /rmdir')
  await shell.exec('echo a > /rmdir/a.txt')
  await shell.exec('rm -r /rmdir')
  const result = await shell.exec('ls /rmdir')
  expect(result.exitCode).not.toBe(0)
})
```

### cp command
```typescript
it('cp copies file on real filesystem', async () => {
  await shell.exec('echo original > /src.txt')
  await shell.exec('cp /src.txt /dst.txt')
  const result = await shell.exec('cat /dst.txt')
  expect(result.output.trim()).toBe('original')
})
```

### mv command
```typescript
it('mv moves file on real filesystem', async () => {
  await shell.exec('echo move me > /old.txt')
  await shell.exec('mv /old.txt /new.txt')
  const oldResult = await shell.exec('cat /old.txt')
  expect(oldResult.exitCode).not.toBe(0)
  const newResult = await shell.exec('cat /new.txt')
  expect(newResult.output.trim()).toBe('move me')
})
```

### Error paths
```typescript
it('cat error format matches UNIX convention', async () => {
  const result = await shell.exec('cat /absent.txt')
  expect(result.output).toMatch(/^cat:.*No such file or directory/)
})
```

### Exit codes
```typescript
it('successful command returns exit code 0', async () => {
  const result = await shell.exec('echo ok')
  expect(result.exitCode).toBe(0)
})

it('failed command returns non-zero exit code', async () => {
  const result = await shell.exec('cat /nonexistent')
  expect(result.exitCode).not.toBe(0)
})
```

## Dependencies

- Depends on Node.js `fs`, `path`, `os` modules (built-in)
- Depends on `AgenticShell` from `../src/index`
- Depends on `AgenticFileSystem` type from `agentic-filesystem`
- No dependency on other m29 tasks

## Edge Cases

| Case | Handling |
|------|----------|
| Temp dir cleanup | `afterAll` removes entire temp dir tree |
| Parallel test isolation | Each describe block uses unique file names to avoid conflicts |
| Symlinks | NodeFsAdapter treats symlinks as their target type |
| Empty files | cat of empty file should return `''` with exitCode 0 |
| Deeply nested paths | `write()` uses `mkdir({ recursive: true })` |

## Verification

1. Run: `vitest run test/node-fs-integration.test.ts` — all pass
2. Run: `vitest run` — no regressions
3. Verify temp dir is cleaned up: `ls /tmp/agentic-shell-test-*` shows nothing after test run
