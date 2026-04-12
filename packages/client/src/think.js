export function think(transport, input, options = {}) {
  const body = {}

  if (typeof input === 'string') {
    body.message = input
  } else {
    body.messages = input
  }

  if (options.model) body.model = options.model
  if (options.history) body.history = options.history
  if (options.sessionId) body.sessionId = options.sessionId
  if (options.tools) {
    body.tools = options.tools.map(t => {
      // Accept both OpenAI format ({ type:'function', function:{...} }) and flat format
      if (t.type === 'function' && t.function) return t
      return {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'object', properties: {} }
        }
      }
    })
  }
  if (options.toolChoice) body.tool_choice = options.toolChoice

  if (options.stream) {
    // Return an object that is both a Promise and an AsyncIterable
    // so callers can do either:
    //   for await (const chunk of ai.think(msg, {stream:true})) { ... }
    //   for await (const chunk of await ai.think(msg, {stream:true})) { ... }
    const gen = streamThink(transport, body)
    return makeAsyncIterablePromise(gen)
  }

  return collectThink(transport, body, options)
}

async function collectThink(transport, body, options) {
  let text = ''
  const toolCalls = []
  for await (const chunk of transport.stream('/api/chat', body)) {
    if (chunk.type === 'content') text += chunk.text || ''
    if (chunk.type === 'tool_use') toolCalls.push({ id: chunk.id, name: chunk.name, args: chunk.input || {} })
  }

  const result = { answer: text }
  if (toolCalls.length) result.toolCalls = toolCalls

  if (options.schema) {
    try {
      result.data = JSON.parse(text)
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) result.data = JSON.parse(match[1].trim())
    }
  }

  return result
}

async function* streamThink(transport, body) {
  for await (const chunk of transport.stream('/api/chat', body)) {
    if (chunk.type === 'content') {
      yield { type: 'text_delta', text: chunk.text || '' }
    } else if (chunk.type === 'tool_use') {
      yield { type: 'tool_use', id: chunk.id || '', name: chunk.name, input: chunk.input || {} }
    } else if (chunk.type === 'error') {
      yield { type: 'error', error: chunk.error || 'unknown error' }
    }
  }
  yield { type: 'done', stopReason: 'end_turn' }
}

// Makes an async generator also work as a direct async iterable,
// so `for await...of think(...)` works without an extra `await`
function makeAsyncIterablePromise(asyncGen) {
  const wrapper = {
    [Symbol.asyncIterator]() { return asyncGen },
    // Also expose .then() so `await think(...)` still works
    then(resolve, reject) { return Promise.resolve(asyncGen).then(resolve, reject) },
  }
  return wrapper
}
