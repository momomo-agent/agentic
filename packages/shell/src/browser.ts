// browser.ts — Browser-compatible AgenticShell with in-memory VFS
import { AgenticShell } from './index'

// Minimal in-memory filesystem implementing AgenticFileSystem interface
class MemFS {
  private files = new Map<string, string>()
  private dirs = new Set<string>(['/'])

  private normalize(p: string) { return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/' }

  async read(path: string) {
    const f = this.files.get(this.normalize(path))
    if (f === undefined) throw new Error(`ENOENT: ${path}`)
    return f
  }

  async write(path: string, content: string) {
    const p = this.normalize(path)
    const dir = p.split('/').slice(0, -1).join('/') || '/'
    this.dirs.add(dir)
    this.files.set(p, content)
  }

  async ls(path: string) {
    const p = this.normalize(path)
    const entries: { name: string; type: 'file' | 'dir'; size: number }[] = []
    const prefix = p === '/' ? '/' : p + '/'
    for (const [fp] of this.files) {
      if (fp.startsWith(prefix) && !fp.slice(prefix.length).includes('/'))
        entries.push({ name: fp.slice(prefix.length), type: 'file', size: this.files.get(fp)!.length })
    }
    for (const dp of this.dirs) {
      if (dp !== p && dp.startsWith(prefix) && !dp.slice(prefix.length).includes('/'))
        entries.push({ name: dp.slice(prefix.length), type: 'dir', size: 0 })
    }
    return entries
  }

  async delete(path: string) { this.files.delete(this.normalize(path)) }

  async mkdir(path: string) { this.dirs.add(this.normalize(path)) }

  async exists(path: string) {
    const p = this.normalize(path)
    return this.files.has(p) || this.dirs.has(p)
  }

  async grep(pattern: string, path: string, opts?: { recursive?: boolean }) {
    const re = new RegExp(pattern)
    const results: { file: string; line: number; content: string }[] = []
    const check = async (fp: string) => {
      const content = this.files.get(fp)
      if (!content) return
      content.split('\n').forEach((line, i) => { if (re.test(line)) results.push({ file: fp, line: i + 1, content: line }) })
    }
    const p = this.normalize(path)
    if (this.files.has(p)) { await check(p) }
    else if (opts?.recursive) { for (const fp of this.files.keys()) if (fp.startsWith(p + '/')) await check(fp) }
    return results
  }
}

export function createBrowserShell(existingFs?: any) {
  const fs = existingFs || new MemFS()
  return new AgenticShell(fs)
}

export { AgenticShell, MemFS }
