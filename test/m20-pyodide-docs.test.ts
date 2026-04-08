import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8')

describe('DBB-005/006: README Pyodide documentation', () => {
  it('DBB-005: README mentions Pyodide and CDN URL', () => {
    expect(readme).toMatch(/Pyodide/i)
    expect(readme).toMatch(/cdn\.jsdelivr\.net\/pyodide/)
  })

  it('DBB-006: README provides offline/CSP workaround', () => {
    expect(readme).toMatch(/self-host/i)
  })
})
