globalThis.AgenticConductor = null
globalThis.AgenticMemory = {
  createMemory: () => {
    const msgs = []
    return {
      id: 'default',
      async user(c) { msgs.push({ role: 'user', content: c }) },
      async assistant(c) { msgs.push({ role: 'assistant', content: c }) },
      messages() { return msgs.slice() },
      history() { return msgs.slice() },
      popLast() { msgs.pop() },
      info() { return { turns: msgs.length, messageCount: msgs.length, tokens: 0, maxTokens: 8000 } },
      clear() { msgs.length = 0 },
      destroy() {},
    }
  },
}

let gate
const gatePromise = new Promise(r => { gate = r })

globalThis.agenticAsk = (input, config) => {
  return (async function* () {
    yield { type: 'text_delta', text: 'partial' }
    await gatePromise
    yield { type: 'done', answer: 'full', rounds: 1 }
  })()
}

const { createClaw } = await import('./src/index.js')
const claw = createClaw({ apiKey: 'k', conductorModule: {} })

let started = false
claw.on('token', () => { started = true })

const resultPromise = claw.chat('hi')

// Wait for token
await new Promise(r => {
  const check = () => started ? r() : setTimeout(check, 5)
  check()
})
console.log('started:', started, 'isGen:', claw.isGenerating)

claw.session().abort()
console.log('aborted, isGen:', claw.isGenerating)

const result = await Promise.race([
  resultPromise,
  new Promise(r => setTimeout(() => r('TIMEOUT'), 1000))
])
console.log('result:', result === 'TIMEOUT' ? 'TIMEOUT' : JSON.stringify(result).slice(0, 100))

gate()
claw.destroy()
process.exit(0)
