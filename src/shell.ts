// shell.ts — Shell command interface over AgenticFileSystem
// Translates ls/cat/grep/find into filesystem operations

import type { AgenticFileSystem } from './filesystem.js'

export class ShellFS {
  constructor(private fs: AgenticFileSystem) {}

  async exec(command: string): Promise<string> {
    const [cmd, ...args] = command.trim().split(/\s+/)
    switch (cmd) {
      case 'ls':   return this.ls(args[0] || '/')
      case 'cat':  return this.cat(args[0])
      case 'grep': return this.grep(args)
      case 'find': return this.find(args)
      case 'rm':   return this.rm(args[0])
      case 'tree': return this.tree(args[0])
      case 'pwd':  return '/'
      default:     return `${cmd}: command not found`
    }
  }

  private async ls(path: string): Promise<string> {
    const entries = await this.fs.ls(path === '/' ? undefined : path)
    if (!entries.length) return ''
    return entries.map(e => e.name).join('\n')
  }

  private async cat(path: string): Promise<string> {
    if (!path) return 'cat: missing operand'
    const result = await this.fs.read(path)
    return result.error ? `cat: ${path}: ${result.error}` : (result.content ?? '')
  }

  private async grep(args: string[]): Promise<string> {
    // grep [-r] <pattern> [path]
    const rIdx = args.indexOf('-r')
    const cleanArgs = args.filter(a => a !== '-r')
    const [pattern, path] = cleanArgs
    if (!pattern) return 'grep: missing pattern'

    const results = await this.fs.grep(pattern)
    const filtered = path ? results.filter(r => r.path.startsWith(path)) : results
    return filtered.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n')
  }

  private async rm(path: string): Promise<string> {
    if (!path) return 'rm: missing operand'
    await this.fs.delete(path)
    return ''
  }

  private async tree(path?: string): Promise<string> {
    const nodes = await this.fs.tree(path ?? '/')
    const lines: string[] = [path ?? '/']
    const render = (nodes: import('./types.js').TreeNode[], depth: number) => {
      for (const n of nodes) {
        lines.push('  '.repeat(depth) + (n.type === 'dir' ? '📁 ' : '') + n.name)
        if (n.children?.length) render(n.children, depth + 1)
      }
    }
    render(nodes, 1)
    return lines.join('\n')
  }

  private async find(args: string[]): Promise<string> {
    // find [path] [-name pattern]
    const nameIdx = args.indexOf('-name')
    const namePattern = nameIdx !== -1 ? args[nameIdx + 1] : undefined
    const basePath = args[0]?.startsWith('-') ? undefined : args[0]

    const entries = await this.fs.ls(basePath)
    const paths = entries.map(e => e.name)
    if (!namePattern) return paths.join('\n')

    const regex = new RegExp(namePattern.replace('*', '.*').replace('?', '.'))
    return paths.filter(p => regex.test(p.split('/').pop() ?? '')).join('\n')
  }
}
