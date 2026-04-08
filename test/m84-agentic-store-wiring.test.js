import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

describe('M84 DBB: agentic-store external package wiring', () => {
  it('package.json has agentic-store in dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toHaveProperty('agentic-store')
  })

  it('src/store/index.js imports from agentic-store package', () => {
    const src = readFileSync(join(root, 'src/store/index.js'), 'utf8')
    expect(src).toMatch(/from ['"]agentic-store['"]/)
  })

  it('src/store/index.js does not use local stub imports', () => {
    const src = readFileSync(join(root, 'src/store/index.js'), 'utf8')
    // Should not import from relative paths like './stub' or '../store/stub'
    expect(src).not.toMatch(/from ['"]\.[\.\/].*stub/)
    expect(src).not.toMatch(/from ['"]\.\.\//)
  })

  it('exports get, set, del functions', () => {
    const src = readFileSync(join(root, 'src/store/index.js'), 'utf8')
    expect(src).toContain('export async function get')
    expect(src).toContain('export async function set')
    expect(src).toMatch(/export.*del/)
  })
})
