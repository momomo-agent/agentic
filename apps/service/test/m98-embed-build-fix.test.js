import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dirname, '..')

describe('M98: embed.js build fix — localEmbed array argument', () => {
  const embedSrc = () => readFileSync(join(root, 'src/runtime/embed.js'), 'utf8')

  it('calls localEmbed with an array argument', () => {
    const src = embedSrc()
    expect(src).toMatch(/localEmbed\(\s*\[/)
  })

  it('destructures the first result from localEmbed', () => {
    const src = embedSrc()
    expect(src).toMatch(/const\s+\[\s*\w+\s*\]\s*=/)
  })

  it('does NOT pass a bare string to localEmbed', () => {
    const src = embedSrc()
    expect(src).not.toMatch(/agenticEmbed\(text\)/)
  })

  it('src/index.js exports embed', () => {
    const src = readFileSync(join(root, 'src/index.js'), 'utf8')
    expect(src).toMatch(/embed/)
  })
})
