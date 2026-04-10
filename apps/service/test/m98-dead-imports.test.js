import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

function walkSync(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkSync(full, results)
    } else if (/\.(js|ts|mjs|cjs)$/.test(entry)) {
      results.push(full)
    }
  }
  return results
}

describe('M98: dead import maps removed from package.json', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const imports = pkg.imports || {}

  it('package.json does NOT have #agentic-voice in imports', () => {
    expect(imports).not.toHaveProperty('#agentic-voice')
  })

  it('package.json still has #agentic-embed in imports', () => {
    expect(imports).toHaveProperty('#agentic-embed')
  })

  it('no source files reference #agentic-voice', () => {
    const files = walkSync(join(root, 'src'))
    const matches = files.filter(f => readFileSync(f, 'utf8').includes('#agentic-voice'))
    expect(matches).toHaveLength(0)
  })
})
