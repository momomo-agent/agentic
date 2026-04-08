import { AgenticFileSystem } from 'agentic-filesystem';
export { AgenticFileSystem, AgenticStoreBackend, MemoryStorage } from 'agentic-filesystem';

interface AgenticConfig {
    /** LLM provider: 'anthropic' | 'openai' | 'custom' */
    provider?: 'anthropic' | 'openai' | 'custom';
    /** Custom provider implementation (for testing/proxy) */
    /** System prompt passed to the LLM */
    systemPrompt?: string;
    /** API key for the provider */
    apiKey?: string;
    /** Base URL for custom/proxy providers */
    baseUrl?: string;
    /** Model name */
    model?: string;
    /** Which tools to enable */
    tools?: ToolName[];
    /** Virtual filesystem for file tools (browser-compatible) */
    filesystem?: AgenticFileSystem;
    /** Tool-specific config */
    toolConfig?: {
        search?: {
            apiKey?: string;
            provider?: 'tavily' | 'serper';
        };
        code?: {
            timeout?: number;
        };
    };
}
type ToolName = 'search' | 'code' | 'file' | 'shell';
interface AgenticResult {
    answer: string;
    sources?: Source[];
    images?: string[];
    codeResults?: CodeResult[];
    files?: FileResult[];
    shellResults?: ShellResult[];
    toolCalls?: ToolCall[];
    usage: {
        input: number;
        output: number;
    };
}
interface Source {
    title: string;
    url: string;
    snippet?: string;
}
interface CodeResult {
    code: string;
    output: string;
    error?: string;
}
interface FileResult {
    path: string;
    action: 'read' | 'write';
    content?: string;
    error?: string;
}
interface ShellResult {
    command: string;
    output: string;
    error?: string;
    exitCode: number;
}
interface ToolCall {
    tool: string;
    input: Record<string, unknown>;
    output: unknown;
}

declare function ask(prompt: string, config?: AgenticConfig): Promise<AgenticResult>;
declare function askStream(prompt: string, config?: AgenticConfig): AsyncGenerator<{
    type: string;
    text?: string;
}>;

export { type AgenticConfig, type AgenticResult, type CodeResult, type FileResult, type ShellResult, type Source, type ToolCall, type ToolName, ask, askStream };
