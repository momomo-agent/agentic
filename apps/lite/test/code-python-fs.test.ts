import { describe, it, expect } from 'vitest'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import { executeCode } from '../src/tools/code.js'

function makeFs() {
  return new AgenticFileSystem({ storage: new MemoryStorage() })
}

describe('Python fs injection - Node environment', () => {
  it('open(path, "r") reads from virtual filesystem', async () => {
    const fs = makeFs()
    await fs.write('/data.txt', 'python data')
    const result = await executeCode({
      code: 'with open("/data.txt") as f: print(f.read())'
    }, fs)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('python data')
  })

  it('open(path, "w") writes to virtual filesystem', async () => {
    const fs = makeFs()
    await executeCode({
      code: 'with open("/out.txt", "w") as f: f.write("test output")'
    }, fs)
    const r = await fs.read('/out.txt')
    expect(r.content).toBe('test output')
  })

  it('open() throws FileNotFoundError for missing file', async () => {
    const fs = makeFs()
    const result = await executeCode({
      code: 'with open("/missing.txt") as f: print(f.read())'
    }, fs)
    expect(result.error).toMatch(/FileNotFoundError|No such file/)
  })

  it('Python code without filesystem works normally', async () => {
    const result = await executeCode({
      code: 'print("hello from python")'
    })
    expect(result.output).toContain('hello from python')
  })

  it('Python with relative path ./file', async () => {
    const fs = makeFs()
    await fs.write('./relative.txt', 'relative content')
    const result = await executeCode({
      code: 'with open("./relative.txt") as f: print(f.read())'
    }, fs)
    expect(result.error).toBeUndefined()
    expect(result.output).toContain('relative content')
  })

  it('Python write multiple lines', async () => {
    const fs = makeFs()
    await executeCode({
      code: `
with open("/multi.txt", "w") as f:
    f.write("line1\\n")
    f.write("line2\\n")
    f.write("line3")
`
    }, fs)
    const r = await fs.read('/multi.txt')
    expect(r.content).toBe('line1\nline2\nline3')
  })
})
