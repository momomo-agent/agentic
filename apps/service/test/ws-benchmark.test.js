import { describe, it } from 'vitest'
import { WebSocketServer } from 'ws'
import http from 'http'

// Benchmark: WebSocket vs HTTP SSE for chat streaming
describe('WS vs HTTP Benchmark', () => {

  // ── Shared mock LLM: yields N chunks then done ──
  async function* mockLLM(chunks = 20) {
    for (let i = 0; i < chunks; i++) {
      yield { type: 'text_delta', text: `chunk_${i} ` }
    }
  }

  // ── HTTP SSE server + client ──
  function createHttpServer() {
    const server = http.createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        let body = ''
        for await (const chunk of req) body += chunk
        const { n } = JSON.parse(body)

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })

        for await (const chunk of mockLLM(n)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        res.write('data: [DONE]\n\n')
        res.end()
      }
    })
    return server
  }

  async function httpChat(port, n) {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ n, messages: [{ role: 'user', content: 'hi' }] }),
    })

    const text = await res.text()
    const chunks = text.split('\n\n').filter(l => l.startsWith('data: ') && !l.includes('[DONE]'))
    return chunks.length
  }

  // ── WebSocket server + client ──
  function createWsServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer })
    wss.on('connection', (ws) => {
      ws.on('message', async (raw) => {
        const msg = JSON.parse(raw)
        if (msg.type === 'chat') {
          for await (const chunk of mockLLM(msg.n)) {
            ws.send(JSON.stringify({ type: 'chat_delta', text: chunk.text, _reqId: msg._reqId }))
          }
          ws.send(JSON.stringify({ type: 'chat_end', _reqId: msg._reqId }))
        }
      })
    })
    return wss
  }

  function wsChat(ws, n) {
    return new Promise((resolve) => {
      const reqId = `r_${Date.now()}`
      let count = 0
      const handler = (raw) => {
        const msg = JSON.parse(raw)
        if (msg._reqId !== reqId) return
        if (msg.type === 'chat_delta') count++
        if (msg.type === 'chat_end') {
          ws.removeListener('message', handler)
          resolve(count)
        }
      }
      ws.on('message', handler)
      ws.send(JSON.stringify({ type: 'chat', _reqId: reqId, n }))
    })
  }

  it('benchmark: WS vs HTTP latency', async () => {
    const CHUNKS = 50
    const ROUNDS = 20

    // Start server
    const httpServer = createHttpServer()
    const wss = createWsServer(httpServer)
    await new Promise(r => httpServer.listen(0, r))
    const port = httpServer.address().port

    // ── HTTP benchmark ──
    const httpTimes = []
    for (let i = 0; i < ROUNDS; i++) {
      const t0 = performance.now()
      await httpChat(port, CHUNKS)
      httpTimes.push(performance.now() - t0)
    }

    // ── WS benchmark (reuse connection) ──
    const { default: WS } = await import('ws')
    const ws = new WS(`ws://127.0.0.1:${port}`)
    await new Promise(r => ws.on('open', r))

    const wsTimes = []
    for (let i = 0; i < ROUNDS; i++) {
      const t0 = performance.now()
      await wsChat(ws, CHUNKS)
      wsTimes.push(performance.now() - t0)
    }

    // ── WS parallel benchmark ──
    const parallelT0 = performance.now()
    await Promise.all(Array.from({ length: ROUNDS }, () => wsChat(ws, CHUNKS)))
    const wsParallelTotal = performance.now() - parallelT0

    // Cleanup
    ws.close()
    wss.close()
    httpServer.close()

    // Stats
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
    const p50 = arr => [...arr].sort((a, b) => a - b)[Math.floor(arr.length * 0.5)]
    const p99 = arr => [...arr].sort((a, b) => a - b)[Math.floor(arr.length * 0.99)]

    const httpAvg = avg(httpTimes)
    const wsAvg = avg(wsTimes)

    console.log(`\n${'═'.repeat(55)}`)
    console.log(`  WS vs HTTP Benchmark (${CHUNKS} chunks × ${ROUNDS} rounds)`)
    console.log(`${'═'.repeat(55)}`)
    console.log(`  HTTP SSE:  avg ${httpAvg.toFixed(2)}ms  p50 ${p50(httpTimes).toFixed(2)}ms  p99 ${p99(httpTimes).toFixed(2)}ms`)
    console.log(`  WebSocket: avg ${wsAvg.toFixed(2)}ms  p50 ${p50(wsTimes).toFixed(2)}ms  p99 ${p99(wsTimes).toFixed(2)}ms`)
    console.log(`  WS ∥${ROUNDS}:   total ${wsParallelTotal.toFixed(2)}ms  (${(wsParallelTotal / ROUNDS).toFixed(2)}ms/req effective)`)
    console.log(`${'─'.repeat(55)}`)
    console.log(`  Speedup:   ${(httpAvg / wsAvg).toFixed(1)}× faster (WS vs HTTP)`)
    console.log(`  Parallel:  ${(httpAvg * ROUNDS / wsParallelTotal).toFixed(1)}× throughput (WS ∥ vs HTTP seq)`)
    console.log(`${'═'.repeat(55)}\n`)
  }, 30000)
})
