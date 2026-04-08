// Shell execution tool — agentic-shell integration

import type { AgenticFileSystem } from 'agentic-filesystem'
import type { ToolDefinition } from 'agentic-core'
import type { ShellResult } from '../types.js'

export const shellToolDef: ToolDefinition = {
  name: 'shell_exec',
  description: 'Execute shell commands (ls, cat, grep, find, pwd, etc.) against the virtual filesystem. Returns command output.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute (e.g., "ls /", "cat /file.txt")' },
    },
    required: ['command'],
  },
}

export function isNodeEnv(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null
}

export async function executeShell(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
): Promise<ShellResult> {
  const command = String(input.command ?? '')

  if (!command) return { command: '', output: '', error: 'No command provided', exitCode: 1 }
  if (!isNodeEnv()) return { command, output: '', error: 'shell_exec not available in browser', exitCode: 1 }
  if (!filesystem) return { command, output: '', error: 'No filesystem configured', exitCode: 1 }

  try {
    const { AgenticShell } = await import('agentic-shell')
    const shell = new AgenticShell(filesystem)
    const result = await shell.exec(command)
    // AgenticShell.exec() returns { output, exitCode } object
    const output = typeof result === 'object' && result !== null ? (result as any).output ?? String(result) : String(result)
    const exitCode = typeof result === 'object' && result !== null ? (result as any).exitCode ?? 0 : 0
    return { command, output, exitCode }
  } catch (err: any) {
    return { command, output: '', error: err.message || String(err), exitCode: 1 }
  }
}
