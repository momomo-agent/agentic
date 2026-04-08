// agentic-core — Generic agent loop

import type { AgentLoopConfig, AgentLoopResult, AgentStreamChunk, ProviderMessage, ProviderToolCall } from './types.js'

const DEFAULT_MAX_TOOL_ROUNDS = 10

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
  const maxRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  const messages: ProviderMessage[] = [{ role: 'user', content: config.prompt }]
  const allToolCalls: AgentLoopResult['toolCalls'] = []
  let totalUsage = { input: 0, output: 0 }

  for (let round = 0; round < maxRounds; round++) {
    const response = await config.provider.chat(messages, config.toolDefs, config.systemPrompt)
    totalUsage.input += response.usage.input
    totalUsage.output += response.usage.output

    if (response.stopReason !== 'tool_use' || response.toolCalls.length === 0) {
      return { answer: response.text, toolCalls: allToolCalls, usage: totalUsage }
    }

    // Execute each tool call via the provided callback
    const toolResults: Array<{ type: 'tool_result'; toolCallId: string; content: string }> = []
    for (const tc of response.toolCalls) {
      const output = await config.executeToolCall(tc)
      allToolCalls.push({ tool: tc.name, input: tc.input, output })
      toolResults.push({ type: 'tool_result', toolCallId: tc.id, content: String(output) })
    }

    // Anthropic needs rawContent for assistant turn replay
    messages.push({ role: 'assistant', content: response.rawContent ?? response.text ?? '' })
    messages.push({ role: 'tool', content: toolResults })
  }

  throw new Error(`Agent loop exceeded ${maxRounds} rounds`)
}

export async function* runAgentLoopStream(config: AgentLoopConfig): AsyncGenerator<AgentStreamChunk> {
  const maxRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  const messages: ProviderMessage[] = [{ role: 'user', content: config.prompt }]
  const allToolCalls: AgentLoopResult['toolCalls'] = []
  let totalInput = 0
  let totalOutput = 0
  let fullText = ''

  for (let round = 0; round < maxRounds; round++) {
    const toolCallsThisRound: ProviderToolCall[] = []

    for await (const chunk of config.provider.stream(messages, config.toolDefs, config.systemPrompt)) {
      if (chunk.type === 'text_delta' && chunk.text) {
        fullText += chunk.text
        yield { type: 'text', text: fullText }
      } else if (chunk.type === 'tool_use' && chunk.toolCall) {
        toolCallsThisRound.push(chunk.toolCall)
      } else if (chunk.type === 'message_stop' && chunk.usage) {
        totalInput += chunk.usage.input
        totalOutput += chunk.usage.output
      }
    }

    if (toolCallsThisRound.length === 0) {
      yield { type: 'done', result: { answer: fullText, toolCalls: allToolCalls, usage: { input: totalInput, output: totalOutput } } }
      return
    }

    const results: string[] = []
    for (const tc of toolCallsThisRound) {
      yield { type: 'tool_start', toolCall: { tool: tc.name, input: tc.input } }
      const output = await config.executeToolCall(tc)
      results.push(output)
      allToolCalls.push({ tool: tc.name, input: tc.input, output })
      yield { type: 'tool_result', toolCall: { tool: tc.name, input: tc.input }, output }
    }

    messages.push({ role: 'assistant', content: '', toolCalls: toolCallsThisRound } as unknown as ProviderMessage)
    messages.push({
      role: 'tool',
      content: toolCallsThisRound.map((tc, i) => ({
        type: 'tool_result' as const,
        toolCallId: tc.id,
        content: results[i],
      })),
    } as ProviderMessage)
  }

  throw new Error(`Agent loop exceeded ${maxRounds} rounds`)
}
