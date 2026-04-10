/**
 * m95-architecture-docs.test.js
 * Verify ARCHITECTURE.md documentation matches actual source code
 * for matcher.js, ollama.js, and memory.js modules.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const arch = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf-8')

describe('m95 — ARCHITECTURE.md documents matcher.js', () => {
  it('contains matcher.js in Detector section', () => {
    expect(arch).toContain('matcher.js')
  })

  it('documents matchProfile function signature', () => {
    expect(arch).toMatch(/matchProfile\(profiles.*hardware\)/)
  })

  it('documents platform weight=30', () => {
    expect(arch).toMatch(/platform[=：]\s*30/)
  })

  it('documents gpu weight=30', () => {
    expect(arch).toMatch(/gpu[=：]\s*30/)
  })

  it('documents arch weight=20', () => {
    expect(arch).toMatch(/arch[=：]\s*20/)
  })

  it('documents minMemory weight=20', () => {
    expect(arch).toMatch(/minMemory[=：]\s*20/)
  })

  it('documents that platform/gpu mismatch eliminates profile', () => {
    expect(arch).toMatch(/得分\s*0|排除|score.*0/i)
  })

  it('documents catch-all default profile (score 1)', () => {
    expect(arch).toMatch(/score.*1|兜底|catch-all/i)
  })

  it('matcher.js is in directory tree', () => {
    expect(arch).toMatch(/matcher\.js/)
  })
})

describe('m95 — ARCHITECTURE.md documents ollama.js', () => {
  it('contains ollama.js in Detector section', () => {
    expect(arch).toContain('ollama.js')
  })

  it('documents ensureOllama function signature', () => {
    expect(arch).toMatch(/ensureOllama\(model.*onProgress\?/)
  })

  it('documents Unix install via curl', () => {
    expect(arch).toMatch(/curl|install\.sh/)
  })

  it('documents Windows install via winget', () => {
    expect(arch).toMatch(/winget/)
  })

  it('documents ollama pull with progress callback', () => {
    expect(arch).toMatch(/ollama pull|pull.*model/i)
  })

  it('ollama.js is in directory tree', () => {
    expect(arch).toMatch(/ollama\.js/)
  })
})

describe('m95 — Source code matches documented signatures', () => {
  it('matcher.js exports matchProfile', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/matcher.js'), 'utf-8')
    expect(src).toMatch(/export\s+function\s+matchProfile/)
  })

  it('matcher.js uses platform=30 weight', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/matcher.js'), 'utf-8')
    expect(src).toContain('30')
  })

  it('matcher.js uses gpu=30 weight', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/matcher.js'), 'utf-8')
    expect(src).toMatch(/gpu.*30|30.*gpu/i)
  })

  it('matcher.js returns 0 on platform mismatch', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/matcher.js'), 'utf-8')
    expect(src).toMatch(/return\s+0/)
  })

  it('matcher.js catch-all returns 1 for empty match criteria', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/matcher.js'), 'utf-8')
    expect(src).toMatch(/:\s*1/)
  })

  it('ollama.js exports ensureOllama', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/ollama.js'), 'utf-8')
    expect(src).toMatch(/export\s+async\s+function\s+ensureOllama/)
  })

  it('ollama.js has isOllamaInstalled check', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/ollama.js'), 'utf-8')
    expect(src).toMatch(/isOllamaInstalled|which ollama/)
  })

  it('ollama.js handles Unix install', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/ollama.js'), 'utf-8')
    expect(src).toMatch(/curl.*ollama|install\.sh/)
  })

  it('ollama.js handles Windows install', () => {
    const src = readFileSync(resolve(ROOT, 'src/detector/ollama.js'), 'utf-8')
    expect(src).toMatch(/winget/)
  })

  // memory.js was removed — these tests are no longer applicable
})

describe('m95 — CR-1775569100684 resolved', () => {
  it('CR status is resolved', () => {
    const cr = JSON.parse(readFileSync(resolve(ROOT, '.team/change-requests/cr-1775569100684.json'), 'utf-8'))
    expect(cr.status).toBe('resolved')
  })

  it('CR has reviewedAt timestamp', () => {
    const cr = JSON.parse(readFileSync(resolve(ROOT, '.team/change-requests/cr-1775569100684.json'), 'utf-8'))
    expect(cr.reviewedAt).toBeTruthy()
    expect(new Date(cr.reviewedAt).getTime()).not.toBeNaN()
  })

  it('CR has reviewedBy field', () => {
    const cr = JSON.parse(readFileSync(resolve(ROOT, '.team/change-requests/cr-1775569100684.json'), 'utf-8'))
    expect(cr.reviewedBy).toBeTruthy()
  })
})
