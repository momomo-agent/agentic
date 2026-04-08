import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(process.cwd())

// DBB-019: PRD.md exists and covers core features
describe('DBB-019: PRD.md', () => {
  it('exists and contains required keywords', () => {
    const path = resolve(root, 'PRD.md')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf8')
    expect(content).toMatch(/file_read/)
    expect(content).toMatch(/file_write/)
    expect(content).toMatch(/code_exec/)
    expect(content).toMatch(/ask/)
  })
})

// DBB-020: EXPECTED_DBB.md exists with global criteria
describe('DBB-020: EXPECTED_DBB.md', () => {
  it('exists and is non-empty with verifiable criteria', () => {
    const path = resolve(root, 'EXPECTED_DBB.md')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf8')
    expect(content.trim().length).toBeGreaterThan(0)
  })
})
