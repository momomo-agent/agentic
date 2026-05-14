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
  console.error('DBG: askFn called')
  return (async function* () {
    console.error('DBG: askFn yield text_delta')
    yield { type: 'text_delta', text: 'partial' }
    console.error('DBG: askFn awaiting gate')
    await gatePromise
    console.error('DBG: askFn yield done')
    yield { type: 'done', answer: 'full', rounds: 1 }
  })()
}

const { createClaw } = await import('./src/index.js')
const claw = createClaw({ apiKey: 'k', conductorModule: {} })

let started = false
claw.on('token', () => { console.error('DBG: token event'); started = true })

console.error('DBG: calling claw.chat')
const resultPromise = claw.chat('hi')
console.error('DBG: chat returned, waiting for token')

await new Promise(r => {
  const check = () => started ? r() : setTimeout(check, 5)
  check()
})
console.error('DBG: token received, isGen:', claw.isGenerating)

claw.session().abort()
console.error('DBG: abort called, isGen:', claw.isGenerating)

const result = await Promise.race([
  resultPromise,
  new Promise(r => setTimeout(() => { console.error('DBG: TIMEOUT'); r('TIMEOUT') }, 2000))
])
console.error('DBG: result:', result === 'TIMEOUT' ? 'TIMEOUT' : 'resolved')

gate()
claw.destroy()
process.exit(0)
