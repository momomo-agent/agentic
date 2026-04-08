// agentic-shell — Shell command interface over AgenticFileSystem

import type { AgenticFileSystem } from 'agentic-filesystem'

interface StreamableFS extends AgenticFileSystem {
  readStream(path: string): AsyncIterable<string>
}
function isStreamable(fs: AgenticFileSystem): fs is StreamableFS {
  return typeof (fs as any).readStream === 'function'
}

export class AgenticShell {
  private cwd = '/'
  private env: Map<string, string> = new Map()
  private jobs: Map<number, { id: number; command: string; status: 'running' | 'stopped' | 'done'; promise: Promise<{ output: string; exitCode: number }> }> = new Map()
  private nextJobId = 1

  setEnv(key: string, value: string): void { this.env.set(key, value) }

  private substituteEnv(cmd: string): string {
    return cmd
      .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n) => this.env.get(n) ?? '')
      .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => this.env.get(n) ?? '')
  }

  private async substituteCommands(cmd: string, depth = 0, maxDepth = 3): Promise<string> {
    if (depth >= maxDepth) return cmd
    let result = cmd
    // Pass 1: $(cmd) substitution
    while (true) {
      const start = result.indexOf('$(')
      if (start === -1) break
      let pdepth = 0, end = -1
      for (let i = start + 1; i < result.length; i++) {
        if (result[i] === '(') pdepth++
        else if (result[i] === ')') { pdepth--; if (pdepth === 0) { end = i; break } }
      }
      if (end === -1) break
      const inner = result.slice(start + 2, end)
      const r = await this.exec(inner, depth + 1)
      result = result.slice(0, start) + (r.exitCode === 0 ? r.output.trim() : '') + result.slice(end + 1)
    }
    // Pass 2: backtick substitution
    while (true) {
      const start = result.indexOf('`')
      if (start === -1) break
      const end = result.indexOf('`', start + 1)
      if (end === -1) break
      const inner = result.slice(start + 1, end)
      const r = await this.exec(inner, depth + 1)
      result = result.slice(0, start) + (r.exitCode === 0 ? r.output.trim() : '') + result.slice(end + 1)
    }
    return result
  }

  constructor(private fs: AgenticFileSystem) {
    const required = ['read', 'write', 'ls', 'delete', 'grep']
    const missing = required.filter(m => typeof (fs as any)[m] !== 'function')
    if (missing.length) throw new Error(`AgenticShell: fs missing required methods: ${missing.join(', ')}`)
    this.env.set('HOME', '/')
    this.env.set('PWD', this.cwd)
    this.env.set('PATH', '/usr/bin:/bin')
  }

  getEnv(key: string): string | undefined { return this.env.get(key) }

  private isBackground(cmd: string): [boolean, string] {
    const trimmed = cmd.trimEnd()
    if (trimmed.endsWith('&')) return [true, trimmed.slice(0, -1).trimEnd()]
    return [false, cmd]
  }

  async exec(command: string, depth = 0): Promise<{ output: string; exitCode: number }> {
    const afterEnv = this.substituteEnv(command.trim())
    const substituted = await this.substituteCommands(afterEnv, depth)
    const [isBg, cleanCmd] = this.isBackground(substituted)
    if (isBg) {
      if (!cleanCmd) return { output: 'exec: missing command', exitCode: 1 }
      const id = this.nextJobId++
      const promise = this.execPipeline(cleanCmd).then(result => {
        this.jobs.get(id)!.status = 'done'
        return result
      })
      this.jobs.set(id, { id, command: cleanCmd, status: 'running', promise })
      return { output: `[${id}] ${id}`, exitCode: 0 }
    }
    return this.execPipeline(substituted)
  }

  private async execPipeline(command: string): Promise<{ output: string; exitCode: number }> {
    const trimmed = command
    if (!trimmed) return { output: '', exitCode: 0 }

    // Handle VAR=value assignment
    const assignMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)
    if (assignMatch) {
      this.env.set(assignMatch[1], assignMatch[2])
      return { output: '', exitCode: 0 }
    }

    // Input redirection: <command> < <file> [>> outfile] or [> outfile]
    const inputMatch = trimmed.match(/^(.+?)\s+<\s+(\S+)((?:\s*>>?\s*\S+)?)$/)
    if (inputMatch) {
      const lhs = inputMatch[1].trim()
      const redirectFile = this.resolve(inputMatch[2])
      const remainder = inputMatch[3].trim()
      if (!lhs) return { output: 'bash: syntax error near unexpected token `<\'', exitCode: 1 }
      const r = await this.fs.read(redirectFile)
      if (r.error) return { output: `bash: ${inputMatch[2]}: No such file or directory`, exitCode: 1 }
      const stdin = r.content ?? ''
      const cmdOutput = await this.execWithStdin(lhs, stdin)
      const lhsCmd = lhs.trim().split(/\s+/)[0]
      const exitCode = (lhsCmd === 'grep' && cmdOutput === '') ? 1 : this.exitCodeFor(cmdOutput)
      if (remainder) {
        const appendRem = remainder.match(/^>>\s*(\S+)$/)
        const writeRem = remainder.match(/^>\s*(\S+)$/)
        if (appendRem) {
          const outPath = this.resolve(appendRem[1])
          const werr = this.checkWritable('bash', outPath)
          if (werr) return { output: werr, exitCode: 1 }
          const existing = await this.fs.read(outPath)
          const current = existing.error ? '' : (existing.content ?? '')
          await this.fs.write(outPath, current + cmdOutput + '\n')
          return { output: '', exitCode: 0 }
        } else if (writeRem) {
          const outPath = this.resolve(writeRem[1])
          const werr = this.checkWritable('bash', outPath)
          if (werr) return { output: werr, exitCode: 1 }
          await this.fs.write(outPath, cmdOutput + '\n')
          return { output: '', exitCode: 0 }
        }
      }
      return { output: cmdOutput, exitCode }
    }

    // Check for >> before > (order matters)
    const appendMatch = trimmed.match(/^(.+?)>>\s*(\S+)$/)
    if (appendMatch) {
      const lhs = appendMatch[1].trim()
      const filePath = this.resolve(appendMatch[2])
      const werr = this.checkWritable('echo', filePath)
      if (werr) return { output: werr, exitCode: 1 }
      const output = await this.execSingle(lhs)
      const exitCode = this.exitCodeFor(output)
      if (exitCode !== 0) return { output, exitCode }
      const existing = await this.fs.read(filePath)
      const current = existing.error ? '' : (existing.content ?? '')
      await this.fs.write(filePath, current + output + '\n')
      return { output: '', exitCode: 0 }
    }
    const writeMatch = trimmed.match(/^(.+?)>\s*(\S+)$/)
    if (writeMatch) {
      const lhs = writeMatch[1].trim()
      const filePath = this.resolve(writeMatch[2])
      const werr = this.checkWritable('echo', filePath)
      if (werr) return { output: werr, exitCode: 1 }
      const output = await this.execSingle(lhs)
      const exitCode = this.exitCodeFor(output)
      if (exitCode !== 0) return { output, exitCode }
      await this.fs.write(filePath, output + '\n')
      return { output: '', exitCode: 0 }
    }

    if (trimmed.includes(' | ')) {
      const segments = trimmed.split(' | ')
      let output = ''
      let exitCode = 0
      for (let i = 0; i < segments.length; i++) {
        if (i === 0) {
          const execResult = await this.execSingleWithError(segments[i].trim())
          output = execResult.output
          if (execResult.hadError) {
            exitCode = this.exitCodeFor(output)
            output = ''
          }
        } else {
          output = await this.execWithStdin(segments[i].trim(), output)
          const segCmd = segments[i].trim().split(/\s+/)[0]
          if (exitCode === 0) {
            if (segCmd === 'grep' && output === '') exitCode = 1
            else if (this.isErrorOutput(output)) exitCode = this.exitCodeFor(output)
          }
        }
      }
      if (exitCode === 0) exitCode = this.exitCodeFor(output)
      return { output, exitCode }
    }
    const output = await this.execSingle(trimmed)
    const cmd = trimmed.split(/\s+/)[0]
    const exitCode = (cmd === 'grep' && output === '') ? 1 : this.exitCodeFor(output)
    return { output, exitCode }
  }

  private async jobs_cmd(_args: string[]): Promise<string> {
    if (this.jobs.size === 0) return ''
    return [...this.jobs.values()]
      .map(j => `[${j.id}] ${j.status.padEnd(9)} ${j.command}`)
      .join('\n')
  }

  private async fg(args: string[]): Promise<string> {
    let id: number
    if (!args[0]) {
      // use most recent job
      id = Math.max(...this.jobs.keys())
      if (!isFinite(id)) return 'fg: current: no such job'
    } else {
      id = parseInt(args[0].replace('%', ''))
    }
    if (isNaN(id) || !this.jobs.has(id)) return `fg: ${args[0] ?? ''}: no such job`
    const job = this.jobs.get(id)!
    const result = await job.promise
    this.jobs.delete(id)
    return result.output
  }

  private async bg(args: string[]): Promise<string> {
    const id = parseInt((args[0] ?? '').replace('%', ''))
    if (isNaN(id) || !this.jobs.has(id)) return `bg: ${args[0] ?? ''}: no such job`
    return ''
  }

  private exitCodeFor(output: string): number {
    const first = output.trimStart().split('\n')[0]
    if (/\bcommand not found\b/.test(first)) return 2
    if (/\b(missing operand|missing pattern|Invalid regular expression)\b/.test(first)) return 2
    if (/^\w[\w-]*: .+: .+/.test(first)) return 1
    return 0
  }

  private async execSingle(command: string): Promise<string> {
    const parts = this.parseArgs(command)
    const [cmd, ...args] = parts
    switch (cmd) {
      case 'ls':    return this.ls(args)
      case 'cat':   return this.cat(args)
      case 'grep':  return this.grep(args)
      case 'find':  return this.find(args)
      case 'pwd':   return this.cwd
      case 'cd':    return this.cd(args[0])
      case 'mkdir': return this.mkdir(args)
      case 'rm':    return this.rm(args)
      case 'mv':    return this.mv(args)
      case 'cp':    return this.cp(args)
      case 'echo':  return args.join(' ')
      case 'export': {
        const expr = args.join(' ')
        const m = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (m) { this.env.set(m[1], m[2]); return '' }
        return 'export: not supported'
      }
      case 'touch': return this.touch(args[0])
      case 'head':  return this.head(args)
      case 'tail':  return this.tail(args)
      case 'wc':    return this.wc(args)
      case 'jobs':  return this.jobs_cmd(args)
      case 'fg':    return this.fg(args)
      case 'bg':    return this.bg(args)
      default:      return `${cmd}: command not found`
    }
  }

  private async execSingleWithError(command: string): Promise<{ output: string, hadError: boolean }> {
    const parts = this.parseArgs(command)
    const [cmd, ...args] = parts
    switch (cmd) {
      case 'cat': {
        const expanded = await this.expandPathArgs(args)
        const paths = expanded.filter(a => !a.startsWith('-'))
        if (!paths.length) return { output: 'cat: missing operand', hadError: true }
        const results = await Promise.all(paths.map(async p => {
          if (/[*?]/.test(p)) return { text: `cat: ${p}: No such file or directory`, err: true }
          const r = await this.fs.read(this.resolve(p))
          return r.error
            ? { text: this.fsError('cat', p, r.error), err: true }
            : { text: r.content ?? '', err: false }
        }))
        const hadError = results.some(r => r.err)
        return { output: results.map(r => r.text).join('\n'), hadError }
      }
      case 'echo':  return { output: args.join(' '), hadError: false }
      case 'pwd':   return { output: this.cwd, hadError: false }
      default: {
        const output = await this.execSingle(command)
        return { output, hadError: this.isErrorOutput(output) }
      }
    }
  }

  private async execWithStdin(command: string, stdin: string): Promise<string> {
    const parts = this.parseArgs(command)
    const [cmd, ...args] = parts
    if (cmd === 'wc') {
      const flags = args.filter(a => a.startsWith('-'))
      const lines = stdin === '' ? 0 : stdin.split('\n').length
      const words = stdin.split(/\s+/).filter(Boolean).length
      const chars = stdin.length
      if (flags.includes('-l')) return String(lines)
      if (flags.includes('-w')) return String(words)
      if (flags.includes('-c')) return String(chars)
      return `${lines}\t${words}\t${chars}`
    }
    if (cmd === 'grep') {
      const rawFlags = args.filter(a => a.startsWith('-'))
      const rest = args.filter(a => !a.startsWith('-'))
      // Expand combined flags like -ic into ['-i', '-c']
      const flags: string[] = []
      for (const f of rawFlags) {
        if (f.length > 2 && f.startsWith('-')) {
          for (let i = 1; i < f.length; i++) flags.push('-' + f[i])
        } else {
          flags.push(f)
        }
      }
      const [pattern] = rest
      if (!pattern) return 'grep: missing pattern'
      const caseInsensitive = flags.includes('-i')
      let regex: RegExp
      try {
        regex = new RegExp(pattern, caseInsensitive ? 'i' : '')
      } catch {
        return `grep: ${pattern}: Invalid regular expression`
      }
      const lines = stdin.split('\n').filter(l => regex.test(l))
      if (!lines.length) return ''
      if (flags.includes('-l')) return lines.length ? '(stdin)' : ''
      if (flags.includes('-c')) return String(lines.length)
      return lines.join('\n')
    }
    return this.execSingle(command)
  }

  private checkWritable(cmd: string, path: string): string | null {
    if ((this.fs as any).readOnly === true) return `${cmd}: ${path}: Permission denied`
    return null
  }

  private isErrorOutput(output: string): boolean {
    return /^\w+: .+: .+/.test(output.trimStart().split('\n')[0])
  }

  private fsError(cmd: string, path: string, err: string): string {
    if (err?.toLowerCase().includes('not found') || err?.toLowerCase().includes('no such'))
      return `${cmd}: ${path}: No such file or directory`
    return `${cmd}: ${path}: ${err}`
  }

  private normalizePath(path: string): string {
    const parts = path.split('/').filter(Boolean)
    const stack: string[] = []
    for (const part of parts) {
      if (part === '..') { if (stack.length) stack.pop() }
      else if (part !== '.') stack.push(part)
    }
    return '/' + stack.join('/')
  }

  private resolve(path: string): string {
    if (!path || path === '.') return this.cwd
    const raw = path.startsWith('/') ? path : (this.cwd === '/' ? '' : this.cwd) + '/' + path
    return this.normalizePath(raw)
  }

  private parseArgs(cmd: string): string[] {
    const parts: string[] = []
    let cur = '', inQ = false, q = ''
    for (const ch of cmd) {
      if (inQ) { if (ch === q) inQ = false; else cur += ch }
      else if (ch === '"' || ch === "'") { inQ = true; q = ch }
      else if (ch === ' ') { if (cur) { parts.push(cur); cur = '' } }
      else cur += ch
    }
    if (cur) parts.push(cur)
    return parts
  }

  private matchGlob(name: string, pattern: string): boolean {
    let re = ''
    let i = 0
    while (i < pattern.length) {
      const ch = pattern[i]
      if (ch === '[') {
        const close = pattern.indexOf(']', i + 1)
        if (close !== -1) {
          let bracket = pattern.slice(i, close + 1)
          // Convert [!abc] -> [^abc] (UNIX glob negation -> regex negation)
          if (bracket.length > 3 && bracket[1] === '!') {
            bracket = '[^' + bracket.slice(2)
          }
          re += bracket
          i = close + 1
          continue
        }
      }
      if (ch === '*') { re += '.*'; i++; continue }
      if (ch === '?') { re += '.'; i++; continue }
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i++
    }
    return new RegExp('^' + re + '$').test(name)
  }

  private async expandRecursiveGlob(baseDir: string, pattern: string): Promise<string[]> {
    const results: string[] = []
    const visited = new Set<string>()
    const stack = [baseDir]

    while (stack.length) {
      const dir = stack.pop()!
      if (visited.has(dir)) continue
      visited.add(dir)

      let entries: Array<{ name: string; type: 'file' | 'dir' }>
      try {
        entries = await this.fs.ls(dir)
      } catch {
        continue
      }

      for (const e of entries) {
        const fullPath = dir === '/' ? '/' + e.name : dir + '/' + e.name
        if (e.type === 'dir') {
          stack.push(fullPath)
        }
        if (this.matchGlob(e.name, pattern)) {
          results.push(fullPath)
        }
      }
    }

    return results
  }

  private async expandGlob(pattern: string, dir: string): Promise<string[]> {
    if (!/[*?[]/.test(pattern)) return [pattern]

    // Handle recursive ** patterns
    const doubleStarIdx = pattern.indexOf('**')
    if (doubleStarIdx !== -1) {
      const before = pattern.slice(0, doubleStarIdx).replace(/\/$/, '')
      const after = pattern.slice(doubleStarIdx + 2).replace(/^\//, '')

      const baseDir = before ? this.resolve(before) : dir
      const matchPattern = after || '*'
      return this.expandRecursiveGlob(baseDir, matchPattern)
    }

    // Original single-directory expansion
    const entries = await this.fs.ls(dir)
    return (entries as Array<{ name: string; type: 'file' | 'dir' }>)
      .filter(e => e.type === 'file' && this.matchGlob(e.name, pattern))
      .map(e => dir === '/' ? '/' + e.name : dir + '/' + e.name)
  }

  private async expandPathArgs(args: string[]): Promise<string[]> {
    const result: string[] = []
    for (const a of args) {
      if (a.startsWith('-') || !/[*?[]/.test(a)) { result.push(a); continue }
      const matches = await this.expandGlob(a, this.cwd)
      if (matches.length) result.push(...matches)
      else result.push(a)
    }
    return result
  }

  private async ls(args: string[]): Promise<string> {
    const long = args.includes('-l') || args.includes('-la') || args.includes('-al')
    const all = args.includes('-a') || args.includes('-la') || args.includes('-al')
    const pageIdx = args.indexOf('--page')
    const page = pageIdx !== -1 ? parseInt(args[pageIdx + 1]) : null
    const sizeIdx = args.indexOf('--page-size')
    const pageSize = sizeIdx !== -1 ? parseInt(args[sizeIdx + 1]) : 20
    const flagArgs = new Set(['-l', '-a', '-la', '-al', '--page', '--page-size'])
    const flagValues = new Set()
    if (pageIdx !== -1 && args[pageIdx + 1]) flagValues.add(args[pageIdx + 1])
    if (sizeIdx !== -1 && args[sizeIdx + 1]) flagValues.add(args[sizeIdx + 1])
    const pathArg = args.find(a => !a.startsWith('-') && !flagValues.has(a))

    // Glob expansion
    if (pathArg && /[*?[]/.test(pathArg)) {
      const matches = await this.expandGlob(pathArg, this.cwd)
      if (!matches.length) return `ls: ${pathArg}: No such file or directory`
      return matches.map(p => p.split('/').pop()!).join('\n')
    }

    const path = pathArg || this.cwd
    let lsResult: any
    try {
      lsResult = await this.fs.ls(this.resolve(path))
    } catch (err: any) {
      return this.fsError('ls', path, err.message ?? String(err))
    }
    if (lsResult && lsResult.error) return this.fsError('ls', path, lsResult.error)
    let entries = lsResult as Array<{ name: string; type: 'file' | 'dir' }>
    if (all) {
      const hasDot = entries.some(e => e.name === '.')
      const hasDotDot = entries.some(e => e.name === '..')
      const synthetic = []
      if (!hasDot) synthetic.push({ name: '.', type: 'dir' as const })
      if (!hasDotDot) synthetic.push({ name: '..', type: 'dir' as const })
      entries = [...synthetic, ...entries]
    } else {
      entries = entries.filter(e => !e.name.startsWith('.'))
    }
    if (page !== null) {
      const validPage = Math.max(1, page)
      const validPageSize = pageSize > 0 ? pageSize : 20
      const start = (validPage - 1) * validPageSize
      const end = start + validPageSize
      entries = entries.slice(start, end)
    }
    if (!entries.length) return ''
    if (long) {
      return entries.map(e => `${e.type === 'dir' ? 'd' : '-'}rwxr-xr-x  ${e.name}`).join('\n')
    }
    return entries.map(e => e.type === 'dir' ? e.name + '/' : e.name).join('\n')
  }

  private async cat(args: string[]): Promise<string> {
    const expanded = await this.expandPathArgs(args)
    const paths = expanded.filter(a => !a.startsWith('-'))
    if (!paths.length) return 'cat: missing operand'
    const results = await Promise.all(paths.map(async p => {
      if (/[*?]/.test(p)) return `cat: ${p}: No such file or directory`
      const r = await this.fs.read(this.resolve(p))
      return r.error ? this.fsError('cat', p, r.error) : (r.content ?? '')
    }))
    return results.join('\n')
  }

  private async grep(args: string[]): Promise<string> {
    const rawFlags = args.filter(a => a.startsWith('-'))
    const rest = args.filter(a => !a.startsWith('-'))
    const [pattern, ...paths] = rest
    if (!pattern) return 'grep: missing pattern'
    // Expand combined flags like -icr into ['-i', '-c', '-r']
    const flags: string[] = []
    for (const f of rawFlags) {
      if (f.length > 2 && f.startsWith('-')) {
        for (let i = 1; i < f.length; i++) flags.push('-' + f[i])
      } else {
        flags.push(f)
      }
    }
    try { new RegExp(pattern, flags.includes('-i') ? 'i' : '') } catch {
      return `grep: ${pattern}: Invalid regular expression`
    }
    const recursive = flags.includes('-r') || flags.includes('-R')

    // Expand glob patterns in file args
    const expandedPaths: string[] = []
    for (const p of paths) {
      if (/[*?]/.test(p)) {
        const matches = await this.expandGlob(p, this.cwd)
        expandedPaths.push(...matches)
      } else {
        expandedPaths.push(p)
      }
    }
    if (paths.length > 0 && expandedPaths.length === 0)
      return `grep: ${paths[0]}: No such file or directory`
    const resolvedPaths = expandedPaths.length ? expandedPaths : paths

    // Use streaming for single non-recursive file path
    if (resolvedPaths.length === 1 && !recursive) {
      const singlePath = resolvedPaths[0]
      try {
        const raw = await this.grepStream(pattern, singlePath, flags)
        const warning = raw[0]?.startsWith('grep: warning:') ? raw[0] : undefined
        const matches = warning ? raw.slice(1) : raw
        if (flags.includes('-c')) return (warning ? warning + '\n' : '') + String(matches.length)
        if (!matches.length) return warning ?? ''
        if (flags.includes('-l')) return (warning ? warning + '\n' : '') + singlePath
        return raw.join('\n')
      } catch (err) {
        return this.fsError('grep', singlePath, String(err))
      }
    }

    // Use streaming for multiple non-recursive files when readStream is available
    if (resolvedPaths.length > 1 && !recursive && isStreamable(this.fs)) {
      const allMatches: string[] = []
      for (const p of resolvedPaths) {
        try {
          const raw = await this.grepStream(pattern, p, flags)
          allMatches.push(...raw.filter(m => !m.startsWith('grep: warning:')))
        } catch (err) {
          allMatches.push(this.fsError('grep', p, String(err)))
        }
      }
      if (flags.includes('-c')) return String(allMatches.length)
      if (!allMatches.length) return ''
      if (flags.includes('-l')) return [...new Set(allMatches.map(m => m.split(':')[0]))].join('\n')
      return allMatches.join('\n')
    }

    const caseInsensitive = flags.includes('-i')

    // Case-insensitive multi-file/recursive: bypass fs.grep() which is case-sensitive
    if (caseInsensitive && (resolvedPaths.length > 0 || recursive)) {
      const regex = new RegExp(pattern, 'i')
      const files: string[] = []
      const searchDirs = resolvedPaths.length ? resolvedPaths : [this.cwd]

      for (const p of searchDirs) {
        const resolved = this.resolve(p)
        let isDir = false
        try { await this.fs.ls(resolved); isDir = true } catch { /* not a dir */ }
        if (isDir) {
          if (recursive) {
            const collected = await this.findRecursive(resolved, undefined, 'f')
            files.push(...collected)
          } else {
            return `grep: ${p}: is a directory`
          }
        } else {
          files.push(resolved)
        }
      }

      interface GrepResult { path: string; line: number; content: string }
      const ciResults: GrepResult[] = []
      for (const file of files) {
        const r = await this.fs.read(file)
        if (r.error) continue
        const lines = (r.content ?? '').split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            ciResults.push({ path: file, line: i + 1, content: lines[i] })
          }
        }
      }

      if (flags.includes('-c')) return String(ciResults.length)
      if (!ciResults.length) {
        for (const p of searchDirs) {
          const resolved = this.resolve(p)
          let lsThrew = false
          try { await this.fs.ls(resolved) } catch { lsThrew = true }
          if (lsThrew) return this.fsError('grep', p, 'No such file or directory')
        }
        return ''
      }
      if (flags.includes('-l')) return [...new Set(ciResults.map(r => r.path))].join('\n')
      return ciResults.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n')
    }

    const allResults = await this.fs.grep(pattern)
    const searchPaths = resolvedPaths.length ? resolvedPaths : (recursive ? [this.cwd] : [])
    const pathFiltered = searchPaths.length
      ? allResults.filter(r => searchPaths.some(p => r.path.startsWith(this.resolve(p))))
      : allResults
    const filtered = caseInsensitive
      ? (() => { const re = new RegExp(pattern, 'i'); return pathFiltered.filter(r => re.test(r.content)) })()
      : pathFiltered
    if (flags.includes('-c')) return String(filtered.length)
    if (!filtered.length) {
      for (const p of searchPaths) {
        const resolved = this.resolve(p)
        let lsThrew = false
        try { await this.fs.ls(resolved) } catch { lsThrew = true }
        if (lsThrew) return this.fsError('grep', p, 'No such file or directory')
      }
      return ''
    }
    if (flags.includes('-l')) return [...new Set(filtered.map(r => r.path))].join('\n')
    return filtered.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n')
  }

  private async grepStream(pattern: string, path: string, flags: string[]): Promise<string[]> {
    const resolved = this.resolve(path)
    let regex: RegExp
    try {
      regex = new RegExp(pattern, flags.includes('-i') ? 'i' : '')
    } catch {
      throw new Error(`${pattern}: Invalid regular expression`)
    }

    if (isStreamable(this.fs)) {
      const matches: string[] = []
      let lineNum = 0
      for await (const line of this.fs.readStream(resolved)) {
        lineNum++
        if (regex.test(line)) matches.push(`${resolved}:${lineNum}: ${line}`)
      }
      return matches
    }

    // Fallback to regular read
    const WARNING = 'grep: warning: streaming unavailable, using read() fallback'
    const r = await this.fs.read(resolved)
    if (r.error) throw new Error(r.error)
    const lines = (r.content ?? '').split('\n')
    const matches: string[] = []
    lines.forEach((line, idx) => {
      if (regex.test(line)) matches.push(`${resolved}:${idx + 1}: ${line}`)
    })
    return [WARNING, ...matches]
  }

  private async findRecursive(
    basePath: string,
    namePattern: RegExp | undefined,
    typeFilter: string | undefined,
    visited = new Set<string>()
  ): Promise<string[]> {
    if (visited.has(basePath)) return []
    visited.add(basePath)
    let entries: { name: string; type: 'file' | 'dir' }[]
    try { entries = await this.fs.ls(basePath) } catch { return [] }
    const results: string[] = []
    for (const e of entries) {
      const fullPath = basePath.replace(/\/$/, '') + '/' + e.name
      const matchesType = !typeFilter || e.type === (typeFilter === 'f' ? 'file' : 'dir')
      const matchesName = !namePattern || namePattern.test(e.name)
      if (matchesType && matchesName) results.push(fullPath)
      if (e.type === 'dir') results.push(...await this.findRecursive(fullPath, namePattern, typeFilter, visited))
    }
    return results
  }

  private async find(args: string[]): Promise<string> {
    const nameIdx = args.indexOf('-name')
    const typeIdx = args.indexOf('-type')
    const namePatternStr = nameIdx !== -1 ? args[nameIdx + 1] : undefined
    const typeFilter = typeIdx !== -1 ? args[typeIdx + 1] : undefined
    const basePath = args[0]?.startsWith('-') ? this.cwd : (args[0] || this.cwd)
    const nameRegex = namePatternStr
      ? new RegExp('^' + namePatternStr.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
      : undefined
    const results = await this.findRecursive(this.resolve(basePath), nameRegex, typeFilter)
    return results.join('\n')
  }

  private async cd(path: string): Promise<string> {
    if (!path || path === '~') { this.cwd = '/'; this.env.set('PWD', '/'); return '' }
    const resolved = this.resolve(path)
    try { await this.fs.ls(resolved) } catch { return `cd: ${path}: No such file or directory` }
    const r = await this.fs.read(resolved)
    if (!r.error && r.content !== undefined) return `cd: ${path}: Not a directory`
    this.cwd = resolved
    this.env.set('PWD', resolved)
    return ''
  }

  private parentOf(path: string): string {
    const parts = path.replace(/\/$/, '').split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  private async mkdirOne(resolved: string): Promise<void> {
    if (typeof (this.fs as any).mkdir === 'function') {
      await (this.fs as any).mkdir(resolved)
    } else {
      await this.fs.write(resolved + '/.keep', '')
    }
  }

  private async mkdir(args: string[]): Promise<string> {
    const recursive = args.includes('-p')
    const paths = args.filter(a => !a.startsWith('-'))
    const err = this.checkWritable('mkdir', this.resolve(paths[0] ?? ''))
    if (err) return err
    for (const p of paths) {
      const resolved = this.resolve(p)
      if (recursive) {
        const segments = resolved.replace(/^\//, '').split('/')
        let prefix = ''
        for (const seg of segments) {
          prefix += '/' + seg
          try { await this.mkdirOne(prefix) } catch { /* already exists, ok */ }
        }
      } else {
        try { await this.fs.ls(this.parentOf(resolved)) } catch {
          return `mkdir: ${p}: No such file or directory`
        }
        try { await this.mkdirOne(resolved) } catch (e: any) {
          const msg = e.message ?? String(e)
          if (msg.toLowerCase().includes('exist'))
            return `mkdir: ${p}: File exists`
          return `mkdir: ${p}: No such file or directory`
        }
      }
    }
    return ''
  }

  private async rmRecursive(path: string): Promise<void> {
    const stack: string[] = [path]
    const toDelete: string[] = []
    const visited = new Set<string>()
    while (stack.length) {
      const cur = stack.pop()!
      if (visited.has(cur)) continue
      visited.add(cur)
      toDelete.push(cur)
      const entries = await this.fs.ls(cur)
      for (const e of entries) {
        const child = cur.replace(/\/$/, '') + '/' + e.name
        if (e.type === 'dir') stack.push(child)
        else toDelete.push(child)
      }
    }
    for (let i = toDelete.length - 1; i >= 0; i--) {
      await this.fs.delete(toDelete[i])
    }
  }

  private async rm(args: string[]): Promise<string> {
    const recursive = args.includes('-r') || args.includes('-rf')
    const expanded = await this.expandPathArgs(args)
    const paths = expanded.filter(a => !a.startsWith('-'))
    if (paths.length === 0) return 'rm: missing operand'
    const werr = this.checkWritable('rm', this.resolve(paths[0] ?? ''))
    if (werr) return werr
    for (const p of paths) {
      const resolved = this.resolve(p)
      if (resolved === '/') return "rm: refusing to remove '/'"
      if (recursive) {
        try {
          await this.rmRecursive(resolved)
        } catch (e: any) {
          return this.fsError('rm', p, e.message ?? String(e))
        }
      } else {
        const r = await this.fs.read(resolved)
        if (r.error && /no such file/i.test(r.error)) return this.fsError('rm', p, 'No such file or directory')
        let lsThrew = false
        try { await this.fs.ls(resolved) } catch { lsThrew = true }
        if (!lsThrew) return `rm: ${p}: is a directory`
        try {
          await this.fs.delete(resolved)
        } catch (e: any) {
          return this.fsError('rm', p, e.message ?? String(e))
        }
      }
    }
    return ''
  }

  private async mv(args: string[]): Promise<string> {
    const [src, dst] = args.filter(a => !a.startsWith('-'))
    if (!src || !dst) return 'mv: missing operand'

    const srcPath = this.resolve(src)
    const dstPath = this.resolve(dst)
    const werr = this.checkWritable('mv', srcPath)
    if (werr) return werr

    // Check if source is a directory
    let isDir = false
    try {
      await this.fs.ls(srcPath)
      isDir = true
    } catch {
      // Not a directory, proceed as file
    }

    if (isDir) {
      // Move directory: copy then delete
      const copyErr = await this.copyRecursive(srcPath, dstPath)
      if (copyErr) return copyErr
      try {
        await this.rmRecursive(srcPath)
      } catch (e: any) {
        return this.fsError('mv', src, e.message ?? String(e))
      }
      return ''
    } else {
      // Existing file move logic
      const r = await this.fs.read(srcPath)
      if (r.error) return this.fsError('mv', src, r.error)
      await this.fs.write(dstPath, r.content ?? '')
      await this.fs.delete(srcPath)
      return ''
    }
  }

  private async cp(args: string[]): Promise<string> {
    const flags = args.filter(a => a.startsWith('-'))
    const recursive = flags.includes('-r') || flags.includes('-R')
    const [src, dst] = args.filter(a => !a.startsWith('-'))
    if (!src || !dst) return 'cp: missing operand'
    const werr = this.checkWritable('cp', this.resolve(dst))
    if (werr) return werr
    if (/[*?]/.test(src)) {
      const matches = await this.expandGlob(src, this.cwd)
      if (!matches.length) return `cp: ${src}: No such file or directory`
      for (const m of matches) {
        const name = m.split('/').pop()!
        const dstPath = this.resolve(dst) + '/' + name
        const r = await this.fs.read(m)
        if (r.error) return this.fsError('cp', m, r.error)
        await this.fs.write(dstPath, r.content ?? '')
      }
      return ''
    }
    if (recursive) return this.copyRecursive(this.resolve(src), this.resolve(dst))
    // Guard: reject directory copy without -r
    try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: -r not specified; omitting directory` } catch { /* not a directory */ }
    const r = await this.fs.read(this.resolve(src))
    if (r.error) return this.fsError('cp', src, r.error)
    await this.fs.write(this.resolve(dst), r.content ?? '')
    return ''
  }

  private async copyRecursive(src: string, dst: string): Promise<string> {
    let entries: Array<{name: string; type: 'file' | 'dir'}>
    try {
      entries = await this.fs.ls(src)
    } catch (err) {
      return this.fsError('cp', src, String(err))
    }
    if (typeof (this.fs as any).mkdir === 'function') {
      try { await (this.fs as any).mkdir(dst) } catch { /* already exists */ }
    }
    for (const entry of entries) {
      const srcPath = src + '/' + entry.name
      const dstPath = dst + '/' + entry.name
      if (entry.type === 'dir') {
        const err = await this.copyRecursive(srcPath, dstPath)
        if (err) return err
      } else {
        const r = await this.fs.read(srcPath)
        if (r.error) return this.fsError('cp', srcPath, r.error)
        await this.fs.write(dstPath, r.content ?? '')
      }
    }
    return ''
  }

  private async touch(path: string): Promise<string> {
    if (!path) return 'touch: missing operand'
    const werr = this.checkWritable('touch', this.resolve(path))
    if (werr) return werr
    const r = await this.fs.read(this.resolve(path))
    if (r.content === undefined || r.content === null) await this.fs.write(this.resolve(path), '')
    return ''
  }

  private async head(args: string[]): Promise<string> {
    const nIdx = args.indexOf('-n')
    const n = nIdx !== -1 ? parseInt(args[nIdx + 1]) : 10
    const path = args.find(a => !a.startsWith('-') && !/^\d+$/.test(a))
    if (!path) return 'head: missing operand'
    const r = await this.fs.read(this.resolve(path))
    if (r.error) return this.fsError('head', path, r.error)
    return (r.content ?? '').split('\n').slice(0, n).join('\n')
  }

  private async tail(args: string[]): Promise<string> {
    const nIdx = args.indexOf('-n')
    const n = nIdx !== -1 ? parseInt(args[nIdx + 1]) : 10
    const path = args.find(a => !a.startsWith('-') && !/^\d+$/.test(a))
    if (!path) return 'tail: missing operand'
    const r = await this.fs.read(this.resolve(path))
    if (r.error) return this.fsError('tail', path, r.error)
    const lines = (r.content ?? '').split('\n')
    return lines.slice(-n).join('\n')
  }

  private async wc(args: string[]): Promise<string> {
    const flags = args.filter(a => a.startsWith('-'))
    const path = args.find(a => !a.startsWith('-'))
    if (!path) return 'wc: missing operand'
    const r = await this.fs.read(this.resolve(path))
    if (r.error) return this.fsError('wc', path, r.error)
    const content = r.content ?? ''
    const lines = content === '' ? 0 : content.split('\n').length
    const words = content.split(/\s+/).filter(Boolean).length
    const chars = content.length
    if (flags.includes('-l')) return `${lines}\t${path}`
    if (flags.includes('-w')) return `${words}\t${path}`
    if (flags.includes('-c')) return `${chars}\t${path}`
    return `${lines}\t${words}\t${chars}\t${path}`
  }
}
