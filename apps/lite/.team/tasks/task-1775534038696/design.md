# Task Design: shell_exec tool

## Overview
Add a new `shell_exec` tool that exposes shell command execution via `agentic-shell` package, allowing AI to run commands like `ls`, `cat`, `grep`, `find` against the virtual filesystem.

## Files to Create

### 1. `src/tools/shell.ts` (new file)

```typescript
// Shell execution tool — agentic-shell integration

import type { AgenticFileSystem } from 'agentic-filesystem'
import type { ToolDefinition } from '../providers/provider.js'

export const shellToolDef: ToolDefinition = {
  name: 'shell_exec',
  description: 'Execute shell commands (ls, cat, grep, find, pwd, etc.) against the virtual filesystem. Returns command output.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute (e.g., "ls /", "cat /file.txt", "grep pattern /dir/*.js")'
      }
    },
    required: ['command']
  }
}

export interface ShellResult {
  command: string
  output: string
  error?: string
  exitCode: number
}

export async function executeShell(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem
): Promise<ShellResult> {
  const command = String(input.command ?? '')

  if (!command) {
    return {
      command: '',
      output: '',
      error: 'No command provided',
      exitCode: 1
    }
  }

  if (!filesystem) {
    return {
      command,
      output: '',
      error: 'No filesystem configured',
      exitCode: 1
    }
  }

  try {
    // Dynamic import to avoid bundling issues
    const { AgenticShell } = await import('agentic-shell')
    const shell = new AgenticShell(filesystem)

    const result = await shell.exec(command)

    return {
      command,
      output: result.stdout || '',
      error: result.stderr || undefined,
      exitCode: result.exitCode || 0
    }
  } catch (err: any) {
    return {
      command,
      output: '',
      error: err.message || String(err),
      exitCode: 1
    }
  }
}
```

## Files to Modify

### 2. `src/tools/index.ts`

**Add export:**
```typescript
export { searchToolDef, executeSearch } from './search.js'
export { codeToolDef, executeCode } from './code.js'
export { fileReadToolDef, fileWriteToolDef, executeFileRead, executeFileWrite } from './file.js'
export { shellToolDef, executeShell } from './shell.js'  // NEW
```

### 3. `src/types.ts`

**Update ToolName type:**
```typescript
export type ToolName = 'search' | 'code' | 'file' | 'shell'
```

**Add ShellResult to exports (optional):**
```typescript
export interface ShellResult {
  command: string
  output: string
  error?: string
  exitCode: number
}
```

**Update AgenticResult interface:**
```typescript
export interface AgenticResult {
  /** Final answer text */
  answer: string
  /** Sources used (from search) */
  sources?: Source[]
  /** Images from search results */
  images?: string[]
  /** Code execution results */
  codeResults?: CodeResult[]
  /** Files read/written */
  files?: FileResult[]
  /** Shell command results */
  shellResults?: ShellResult[]  // NEW
  /** Raw tool calls made */
  toolCalls?: ToolCall[]
  /** Token usage */
  usage?: { input: number; output: number }
}
```

### 4. `src/ask.ts`

**Import shell tool:**
```typescript
import { shellToolDef, executeShell } from './tools/shell.js'
```

**Register shell tool in tool setup logic:**
```typescript
// Find the section where tools are registered (around line 20-40)
// Add after file tool registration:

if (tools.includes('shell')) {
  toolDefs.push(shellToolDef)
  toolHandlers.set('shell_exec', (input) =>
    executeShell(input, config.filesystem)
  )
}
```

**Track shell results (in tool execution loop):**
```typescript
// In the tool execution loop, after handling other tools:
const allShellResults: ShellResult[] = []

// In tool result handling:
if (toolName === 'shell_exec') {
  allShellResults.push(toolResult as ShellResult)
}

// In final return statement:
return {
  answer: finalText,
  sources: allSources,
  images: allImages,
  codeResults: allCodeResults,
  files: allFiles,
  shellResults: allShellResults,  // NEW
  toolCalls: allToolCalls,
  usage: totalUsage
}
```

### 5. `package.json`

**Add dependency:**
```json
{
  "dependencies": {
    "agentic-shell": "link:../agentic-shell"
  }
}
```

## Function Signatures

```typescript
// New functions in shell.ts
export async function executeShell(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem
): Promise<ShellResult>

// New interface
export interface ShellResult {
  command: string
  output: string
  error?: string
  exitCode: number
}

// Modified type in types.ts
export type ToolName = 'search' | 'code' | 'file' | 'shell'
```

## Algorithm

1. Receive command string from tool input
2. Validate command is not empty
3. Check filesystem is configured
4. Import `AgenticShell` from agentic-shell package
5. Create shell instance with filesystem
6. Execute command via `shell.exec(command)`
7. Return ShellResult with stdout, stderr, exitCode
8. Track result in `allShellResults` array
9. Include in final `AgenticResult`

## Edge Cases

1. **No filesystem configured:** Return error "No filesystem configured"
2. **Empty command:** Return error "No command provided"
3. **Unknown command:** agentic-shell returns error, pass through
4. **Command with pipes:** agentic-shell should handle (e.g., `ls | grep txt`)
5. **Command with redirects:** agentic-shell should handle (e.g., `cat file > out`)
6. **Long output:** No truncation initially (future: add max output size)
7. **Command timeout:** Rely on agentic-shell timeout handling

## Error Handling

- Missing filesystem → return ShellResult with error field
- Empty command → return ShellResult with error field
- agentic-shell import failure → catch and return error
- Command execution failure → captured in stderr/exitCode
- Unknown command → agentic-shell returns error, pass through

## Dependencies

- `agentic-shell` package (shell command emulation for virtual filesystem)
- `agentic-filesystem` (already a dependency)

## Test Cases

```typescript
// tests/shell.test.ts
import { executeShell } from '../src/tools/shell.js'
import { AgenticFileSystem } from 'agentic-filesystem'

describe('shell_exec tool', () => {
  test('ls command', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/file1.txt', 'content1')
    fs.write('/file2.txt', 'content2')

    const result = await executeShell({ command: 'ls /' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('file1.txt')
    expect(result.output).toContain('file2.txt')
  })

  test('cat command', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/test.txt', 'hello world')

    const result = await executeShell({ command: 'cat /test.txt' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('hello world')
  })

  test('grep command', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/data.txt', 'line1\nline2\nline3')

    const result = await executeShell({ command: 'grep line2 /data.txt' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('line2')
  })

  test('pwd command', async () => {
    const fs = new AgenticFileSystem()

    const result = await executeShell({ command: 'pwd' }, fs)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('/')
  })

  test('unknown command', async () => {
    const fs = new AgenticFileSystem()

    const result = await executeShell({ command: 'unknowncmd' }, fs)
    expect(result.exitCode).not.toBe(0)
    expect(result.error).toBeDefined()
  })

  test('no filesystem', async () => {
    const result = await executeShell({ command: 'ls' })
    expect(result.error).toContain('No filesystem configured')
  })

  test('empty command', async () => {
    const fs = new AgenticFileSystem()

    const result = await executeShell({ command: '' }, fs)
    expect(result.error).toContain('No command provided')
  })
})
```

## Integration Test

```typescript
// tests/integration/shell-integration.test.ts
import { ask } from '../src/ask.js'
import { AgenticFileSystem } from 'agentic-filesystem'

describe('shell tool integration', () => {
  test('AI uses shell to explore filesystem', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/project/src/index.js', 'console.log("hello")')
    fs.write('/project/README.md', '# Project')

    const result = await ask('List all files in /project', {
      apiKey: 'test-key',
      provider: 'anthropic',
      tools: ['shell'],
      filesystem: fs
    })

    expect(result.shellResults).toBeDefined()
    expect(result.shellResults!.length).toBeGreaterThan(0)
    expect(result.answer).toContain('index.js')
  })
})
```

## Performance Considerations

- agentic-shell operations are in-memory (fast)
- Command parsing overhead is minimal
- No subprocess spawning (unlike real shell)
- Typical command execution: <10ms

## Security

- Commands execute against virtual filesystem only
- No access to real OS filesystem
- No network access
- No process spawning (except via agentic-shell's safe implementation)
- Path traversal contained within virtual filesystem
