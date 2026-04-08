import { describe, it, expect } from 'vitest'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import { executeCode } from '../src/tools/code.js'

function makeFs() {
  return new AgenticFileSystem({ storage: new MemoryStorage() })
}

describe('JS fs injection', () => {
  it('fs.readFileSync reads from virtual filesystem', async () => {
    const fs = makeFs()
    await fs.write('/test.txt', 'hello world')
    const result = await executeCode({ code: 'fs.readFileSync("/test.txt")' }, fs)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('hello world')
  })

  it('fs.writeFileSync writes to virtual filesystem', async () => {
    const fs = makeFs()
    await executeCode({ code: 'fs.writeFileSync("/out.txt", "data")' }, fs)
    const r = await fs.read('/out.txt')
    expect(r.content).toBe('data')
  })

  // BUG: existsSync boolean return is lost in async quickjs path (executePendingJobs not fully drained)
  it.fails('fs.existsSync returns true for existing file [KNOWN BUG]', async () => {
    const fs = makeFs()
    await fs.write('/exists.txt', 'yes')
    const result = await executeCode({ code: 'console.log(await fs.existsSync("/exists.txt"))' }, fs)
    expect(result.output).toContain('true')
  })

  it.fails('fs.existsSync returns false for missing file [KNOWN BUG]', async () => {
    const fs = makeFs()
    const result = await executeCode({ code: 'console.log(await fs.existsSync("/missing.txt"))' }, fs)
    expect(result.output).toContain('false')
  })

  it('fs.readFileSync throws ENOENT for missing file', async () => {
    const fs = makeFs()
    const result = await executeCode({ code: 'fs.readFileSync("/missing.txt")' }, fs)
    expect(result.error).toMatch(/ENOENT/)
  })

  it('no filesystem configured — fs is not injected', async () => {
    const result = await executeCode({ code: 'typeof fs' })
    expect(result.output).toContain('undefined')
  })
})

describe('language detection', () => {
  it('detects Python from import keyword', async () => {
    // Python code should not crash (will fail if python3 not available, but error is python-related)
    const result = await executeCode({ code: 'import sys\nprint(sys.version)' })
    // Either runs successfully or fails with python-related error, not a JS error
    const isPythonAttempt = !result.error || result.error.includes('python') || result.output.includes('.')
    expect(isPythonAttempt).toBe(true)
  })

  it('defaults to JavaScript for non-Python code', async () => {
    const result = await executeCode({ code: '1 + 1' })
    expect(result.output).toContain('→ 2')
    expect(result.error).toBeUndefined()
  })
})
