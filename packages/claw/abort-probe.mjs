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

let neverResolve
const neverPromise = new Promise(r => { neverResolve = r })

globalThis.agenticAsk = (input, config) => {
  console.log('askFn called, signal?', !!config.signal)
  return (async function* () {
    try {
      yield { type: 'status', message: 'starting' }
      yield { type: 'text_delta', text: 'partial' }
      console.log('askFn: about to await neverPromise')
      await neverPromise
      yield { type: 'done', answer: 'should not reach', rounds: 1 }
    } finally {
      console.log('askFn: generator finally block')
    }
  })()
}

const { createClaw } = await import('./src/index.js')
const claw = createClaw({ apiKey: 'k', conductorModule: {} })
const session = claw.session()

const gen = session.chat('test')
const iter = gen[Symbol.asyncIterator]()

const e1 = await iter.next()
console.log('e1:', e1.value?.type)
const e2 = await iter.next()
console.log('e2:', e2.value?.type, 'isGen:', session.isGenerating)

console.log('calling abort...')
session.abort()
console.log('abort called, isGen:', session.isGenerating)

console.log('calling iter.next()...')
const e3 = await Promise.race([
  iter.next(),
  new Promise(r => setTimeout(() => r('TIMEOUT'), 1000))
])
console.log('e3:', e3)

neverResolve()
claw.destroy()
process.exit(0)
