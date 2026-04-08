import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

describe('task-1775535865241: Wire agentic-embed as external package', () => {
  it('package.json has agentic-embed in dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toHaveProperty('agentic-embed')
  })

  it('package.json has #agentic-embed import map pointing to local adapter', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(pkg.imports?.['#agentic-embed']).toMatch(/embed/)
  })

  it('src/runtime/embed.js imports from agentic-embed (not local path)', () => {
    const src = readFileSync(join(root, 'src/runtime/embed.js'), 'utf8')
    expect(src).toMatch(/from ['"]agentic-embed['"]/)
    expect(src).not.toMatch(/from ['"]\./)
  })

  it('embed.js exports embed function with correct guards', () => {
    const src = readFileSync(join(root, 'src/runtime/embed.js'), 'utf8')
    expect(src).toMatch(/export.*function embed|export.*embed/)
    expect(src).toMatch(/TypeError/)
    expect(src).toMatch(/text must be a string/)
  })

  it('agentic-embed resolves as a module with embed export', async () => {
    const mod = await import('#agentic-embed')
    expect(typeof mod.embed).toBe('function')
  })
})
