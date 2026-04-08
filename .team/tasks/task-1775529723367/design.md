# Task Design: Add systemPrompt multi-round test

## Goal
Verify that `systemPrompt` is forwarded to `provider.chat()` on every round, including through tool-use rounds.

## New File
`test/ask-system-prompt-multiround.test.ts`

## Test: DBB-006-multiround

```ts
describe('DBB-006-multiround: systemPrompt passed on every tool round', () => {
  it('chat() receives systemPrompt on all 3 calls (2 tool rounds + final)', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'web_search', { query: 'q1' }))
      .mockResolvedValueOnce(toolUseResponse('t2', 'web_search', { query: 'q2' }))
      .mockResolvedValueOnce(finalResponse('done'))

    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: ['search'],
      toolConfig: { search: { apiKey: 'mock' } },
      systemPrompt: 'You are a test bot.',
    }

    vi.mock('../src/tools/search.js', () => ({
      searchToolDef: { name: 'web_search', description: '', parameters: {} },
      executeSearch: vi.fn().mockResolvedValue({ text: 'r', sources: [], images: [] }),
    }))

    const result = await ask('go', config)

    expect(chat).toHaveBeenCalledTimes(3)
    for (const call of chat.mock.calls) {
      expect(call[2]).toBe('You are a test bot.')
    }
    expect(result.answer).toBe('done')
  })
})
```

## Helper functions (same as ask-loop.test.ts)
- `toolUseResponse(id, name, input)` — returns `ProviderResponse` with `stopReason: 'tool_use'`
- `finalResponse(text)` — returns `ProviderResponse` with `stopReason: 'end'`

## No source changes needed
`ask.ts` already passes `config.systemPrompt` as 3rd arg to `provider.chat()` on every round.

## Test Cases to Verify
- `chat` called exactly 3 times
- Each call's 3rd argument equals `'You are a test bot.'`
- `result.answer === 'done'`
