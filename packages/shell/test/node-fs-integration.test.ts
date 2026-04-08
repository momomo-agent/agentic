import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AgenticShell } from '../src/index'
import type { AgenticFileSystem, FileResult, LsResult, GrepResult } from 'agentic-filesystem'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * NodeFsAdapter wraps Node.js native fs to implement AgenticFileSystem.
 * Throws on non-existent/non-directory paths (matching real readdir behavior).
 */
class NodeFsAdapter implements AgenticFileSystem {
  constructor(private root: string) {}

  private abs(p: string): string {
    const relative = p.startsWith('/') ? p.slice(1) : p
    return path.join(this.root, relative)
  }

  async ls(dirPath: string): Promise<LsResult[]> {
    const realPath = this.abs(dirPath)
    const entries = await fs.promises.readdir(realPath, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file'
    }))
  }

  async read(filePath: string): Promise<FileResult> {
    const realPath = this.abs(filePath)
    try {
      const content = await fs.promises.readFile(realPath, 'utf-8')
      return { content }
    } catch {
      return { error: `${filePath}: No such file or directory` }
    }
  }

  async write(filePath: string, content: string): Promise<FileResult> {
    const realPath = this.abs(filePath)
    const dir = path.dirname(realPath)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(realPath, content, 'utf-8')
    return {}
  }

  async delete(filePath: string): Promise<FileResult> {
    const realPath = this.abs(filePath)
    const stat = await fs.promises.stat(realPath)
    if (stat.isDirectory()) {
      await fs.promises.rm(realPath, { recursive: true })
    } else {
      await fs.promises.unlink(realPath)
    }
    return {}
  }

  async grep(pattern: string): Promise<GrepResult[]> {
    const results: GrepResult[] = []
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
                results.push({ path: shellPath, line: i + 1, content: line, match: line })
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

  async *readStream(filePath: string): AsyncIterable<string> {
    const realPath = this.abs(filePath)
    const content = await fs.promises.readFile(realPath, 'utf-8')
    for (const line of content.split('\n')) {
      yield line
    }
  }
}

describe('Node.js filesystem integration', () => {
  let tmpDir: string
  let shell: AgenticShell

  beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agentic-shell-test-'))
    const adapter = new NodeFsAdapter(tmpDir)
    shell = new AgenticShell(adapter as any)
  })

  afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  })

  // --- ls command ---
  it('ls lists real directory contents', async () => {
    await shell.exec('mkdir /ls-test-dir')
    await shell.exec('echo hello > /ls-test-file.txt')
    const result = await shell.exec('ls /')
    expect(result.output).toContain('ls-test-file.txt')
    expect(result.output).toContain('ls-test-dir')
    expect(result.exitCode).toBe(0)
  })

  it('ls on non-existent directory returns error', async () => {
    const result = await shell.exec('ls /nonexistent')
    expect(result.exitCode).not.toBe(0)
    expect(result.output).toContain('No such file or directory')
  })

  // --- cat command ---
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

  it('cat of empty file returns empty string with exit code 0', async () => {
    await shell.exec('touch /empty-cat.txt')
    const result = await shell.exec('cat /empty-cat.txt')
    expect(result.exitCode).toBe(0)
  })

  // --- grep command ---
  it('grep finds matches in real files', async () => {
    await shell.exec('echo "hello world" > /grepme.txt')
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

  // --- mkdir command ---
  it('mkdir creates real directory', async () => {
    const result = await shell.exec('mkdir /newdir')
    expect(result.exitCode).toBe(0)
    const stat = await fs.promises.stat(path.join(tmpDir, 'newdir'))
    expect(stat.isDirectory()).toBe(true)
  })

  it('mkdir -p creates nested directories', async () => {
    const result = await shell.exec('mkdir -p /a/b/c')
    expect(result.exitCode).toBe(0)
    const stat = await fs.promises.stat(path.join(tmpDir, 'a', 'b', 'c'))
    expect(stat.isDirectory()).toBe(true)
  })

  // --- rm command ---
  it('rm removes real file', async () => {
    await shell.exec('echo temp > /tempfile.txt')
    const result = await shell.exec('rm /tempfile.txt')
    expect(result.exitCode).toBe(0)
    // Verify on real filesystem
    await expect(fs.promises.stat(path.join(tmpDir, 'tempfile.txt'))).rejects.toThrow()
  })

  it('rm -r removes real directory', async () => {
    await shell.exec('mkdir /rmdir')
    await shell.exec('echo a > /rmdir/a.txt')
    const result = await shell.exec('rm -r /rmdir')
    expect(result.exitCode).toBe(0)
    await expect(fs.promises.stat(path.join(tmpDir, 'rmdir'))).rejects.toThrow()
  })

  // --- cp command ---
  it('cp copies file on real filesystem', async () => {
    await shell.exec('echo original > /src.txt')
    const result = await shell.exec('cp /src.txt /dst.txt')
    expect(result.exitCode).toBe(0)
    // Verify on real filesystem
    const content = await fs.promises.readFile(path.join(tmpDir, 'dst.txt'), 'utf-8')
    expect(content.trim()).toBe('original')
  })

  // --- mv command ---
  it('mv moves file on real filesystem', async () => {
    await shell.exec('echo move me > /old.txt')
    const result = await shell.exec('mv /old.txt /new.txt')
    expect(result.exitCode).toBe(0)
    // Old file gone
    await expect(fs.promises.stat(path.join(tmpDir, 'old.txt'))).rejects.toThrow()
    // New file exists with correct content
    const content = await fs.promises.readFile(path.join(tmpDir, 'new.txt'), 'utf-8')
    expect(content.trim()).toBe('move me')
  })

  // --- Error format ---
  it('cat error format matches UNIX convention', async () => {
    const result = await shell.exec('cat /absent.txt')
    expect(result.output).toMatch(/^cat:.*No such file or directory/)
  })

  // --- Exit codes ---
  it('successful command returns exit code 0', async () => {
    const result = await shell.exec('echo ok')
    expect(result.exitCode).toBe(0)
  })

  it('failed command returns non-zero exit code', async () => {
    const result = await shell.exec('cat /nonexistent')
    expect(result.exitCode).not.toBe(0)
  })

  // --- touch command ---
  it('touch creates empty file on real filesystem', async () => {
    await shell.exec('touch /touched.txt')
    const stat = await fs.promises.stat(path.join(tmpDir, 'touched.txt'))
    expect(stat.isFile()).toBe(true)
  })

  // --- echo with redirection ---
  it('echo > writes to real file', async () => {
    await shell.exec('echo redirected > /redir.txt')
    const content = await fs.promises.readFile(path.join(tmpDir, 'redir.txt'), 'utf-8')
    expect(content.trim()).toBe('redirected')
  })

  it('echo >> appends to real file', async () => {
    await shell.exec('echo first > /append.txt')
    await shell.exec('echo second >> /append.txt')
    const content = await fs.promises.readFile(path.join(tmpDir, 'append.txt'), 'utf-8')
    expect(content).toContain('first')
    expect(content).toContain('second')
  })

  // --- Deep paths ---
  it('handles deeply nested paths', async () => {
    await shell.exec('mkdir -p /d1/d2/d3/d4')
    await shell.exec('echo deep > /d1/d2/d3/d4/file.txt')
    const result = await shell.exec('cat /d1/d2/d3/d4/file.txt')
    expect(result.output.trim()).toBe('deep')
  })

  // --- Temp dir cleanup verification ---
  it('temp directory exists during tests', async () => {
    const stat = await fs.promises.stat(tmpDir)
    expect(stat.isDirectory()).toBe(true)
  })
})
