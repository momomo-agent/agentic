// agentic-lite — Types

import type { AgenticFileSystem } from 'agentic-filesystem'

export interface AgenticConfig {
  /** LLM provider: 'anthropic' | 'openai' | 'custom' */
  provider?: 'anthropic' | 'openai' | 'custom'
  /** Custom provider implementation (for testing/proxy) */
  /** System prompt passed to the LLM */
  systemPrompt?: string
  /** API key for the provider */
  apiKey?: string
  /** Base URL for custom/proxy providers */
  baseUrl?: string
  /** Model name */
  model?: string
  /** Which tools to enable */
  tools?: ToolName[]
  /** Virtual filesystem for file tools (browser-compatible) */
  filesystem?: AgenticFileSystem
  /** Tool-specific config */
  toolConfig?: {
    search?: { apiKey?: string; provider?: 'tavily' | 'serper' }
    code?: { timeout?: number }
  }
}

export type ToolName = 'search' | 'code' | 'file' | 'shell'

export interface AgenticResult {
  answer: string
  sources?: Source[]
  images?: string[]
  codeResults?: CodeResult[]
  files?: FileResult[]
  shellResults?: ShellResult[]
  toolCalls?: ToolCall[]
  usage: { input: number; output: number }
}

export interface Source {
  title: string
  url: string
  snippet?: string
}

export interface CodeResult {
  code: string
  output: string
  error?: string
}

export interface FileResult {
  path: string
  action: 'read' | 'write'
  content?: string
  error?: string
}

export interface ShellResult {
  command: string
  output: string
  error?: string
  exitCode: number
}

export interface ToolCall {
  tool: string
  input: Record<string, unknown>
  output: unknown
}
