import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const CORE_DIR = 'packages/agentic-core'

describe('DBB-001: agentic-core package builds cleanly', () => {
  it('npm run build exits with code 0', () => {
    expect(() => {
      execSync('npm run build', { cwd: CORE_DIR, stdio: 'pipe' })
    }).not.toThrow()
  })

  it('dist/index.js is generated', () => {
    expect(existsSync(`${CORE_DIR}/dist/index.js`)).toBe(true)
    const content = readFileSync(`${CORE_DIR}/dist/index.js`, 'utf-8')
    expect(content.length).toBeGreaterThan(0)
  })

  it('dist/index.d.ts is generated', () => {
    expect(existsSync(`${CORE_DIR}/dist/index.d.ts`)).toBe(true)
    const content = readFileSync(`${CORE_DIR}/dist/index.d.ts`, 'utf-8')
    expect(content.length).toBeGreaterThan(0)
  })
})

describe('DBB-002: All required exports present', () => {
  const dts = readFileSync(`${CORE_DIR}/dist/index.d.ts`, 'utf-8')

  it('exports runAgentLoop function', () => {
    expect(dts).toContain('declare function runAgentLoop')
  })

  it('exports createProvider function', () => {
    expect(dts).toContain('declare function createProvider')
  })

  it('exports createAnthropicProvider function', () => {
    expect(dts).toContain('declare function createAnthropicProvider')
  })

  it('exports createOpenAIProvider function', () => {
    expect(dts).toContain('declare function createOpenAIProvider')
  })

  it('exports Provider interface', () => {
    expect(dts).toContain('interface Provider')
    expect(dts).toContain('chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse>')
  })

  it('exports ProviderMessage interface', () => {
    expect(dts).toContain('interface ProviderMessage')
    expect(dts).toContain("role: 'user' | 'assistant' | 'tool'")
  })

  it('exports ToolDefinition interface', () => {
    expect(dts).toContain('interface ToolDefinition')
    expect(dts).toContain('name: string')
    expect(dts).toContain('description: string')
    expect(dts).toContain('parameters: Record<string, unknown>')
  })

  it('exports ProviderToolCall interface', () => {
    expect(dts).toContain('interface ProviderToolCall')
    expect(dts).toContain('id: string')
  })

  it('exports ProviderConfig interface', () => {
    expect(dts).toContain('interface ProviderConfig')
  })

  it('exports AgentLoopConfig interface', () => {
    expect(dts).toContain('interface AgentLoopConfig')
    expect(dts).toContain('provider: Provider')
    expect(dts).toContain('prompt: string')
    expect(dts).toContain('toolDefs: ToolDefinition[]')
    expect(dts).toContain('executeToolCall: (toolCall: ProviderToolCall) => Promise<string>')
  })

  it('exports AgentLoopResult interface', () => {
    expect(dts).toContain('interface AgentLoopResult')
    expect(dts).toContain('answer: string')
    expect(dts).toContain('toolCalls: Array<')
    expect(dts).toContain('usage: {')
  })

  it('exports ProviderResponse interface', () => {
    expect(dts).toContain('interface ProviderResponse')
    expect(dts).toContain("stopReason: 'end' | 'tool_use'")
  })

  it('exports ProviderToolContent interface', () => {
    expect(dts).toContain('interface ProviderToolContent')
    expect(dts).toContain("type: 'tool_result'")
    expect(dts).toContain('toolCallId: string')
  })
})

describe('DBB-003: No forbidden imports', () => {
  const srcFiles = [
    `${CORE_DIR}/src/types.ts`,
    `${CORE_DIR}/src/loop.ts`,
    `${CORE_DIR}/src/index.ts`,
    `${CORE_DIR}/src/providers/anthropic.ts`,
    `${CORE_DIR}/src/providers/openai.ts`,
    `${CORE_DIR}/src/providers/index.ts`,
  ]

  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf-8')

    it(`${file} has no agentic-lite import`, () => {
      expect(content).not.toContain('agentic-lite')
    })

    it(`${file} has no agentic-filesystem import`, () => {
      expect(content).not.toContain('agentic-filesystem')
    })

    it(`${file} has no agentic-shell import`, () => {
      expect(content).not.toContain('agentic-shell')
    })

    it(`${file} has no quickjs import`, () => {
      expect(content).not.toContain('quickjs')
    })

    it(`${file} has no pyodide import`, () => {
      expect(content).not.toContain('pyodide')
    })
  }
})
