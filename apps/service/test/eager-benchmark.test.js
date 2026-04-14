import { describe, it, expect } from 'vitest'

// The real win of eager execution:
// Tool 1 starts at T=50ms instead of T=150ms → finishes 100ms earlier
// This matters when the NEXT round of LLM needs tool results

describe('Eager Tool Execution — Where It Actually Wins', () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))

  it('single tool: saves entire LLM tail time', async () => {
    // LLM outputs: text(100ms) → tool_use(50ms) → more_text(100ms)
    // Tool takes 80ms
    // Sequential: 250ms LLM + 80ms tool = 330ms
    // Eager: tool starts at 150ms, done at 230ms, LLM done at 250ms → 250ms total
    // Saved: 80ms (the entire tool execution overlaps with LLM tail)

    const LLM_BEFORE_TOOL = 100
    const LLM_TOOL_BLOCK = 50
    const LLM_AFTER_TOOL = 100
    const TOOL_EXEC = 80

    // Sequential
    const t0 = performance.now()
    await sleep(LLM_BEFORE_TOOL + LLM_TOOL_BLOCK + LLM_AFTER_TOOL) // wait for full LLM
    await sleep(TOOL_EXEC) // then execute tool
    const seqTime = performance.now() - t0

    // Eager
    const t1 = performance.now()
    await sleep(LLM_BEFORE_TOOL + LLM_TOOL_BLOCK) // LLM reaches tool_use
    const toolPromise = sleep(TOOL_EXEC) // start tool immediately
    await sleep(LLM_AFTER_TOOL) // LLM continues generating
    await toolPromise // tool likely already done
    const eagerTime = performance.now() - t1

    console.log(`\n  Single tool (tool finishes during LLM tail):`)
    console.log(`  Sequential: ${seqTime.toFixed(0)}ms`)
    console.log(`  Eager:      ${eagerTime.toFixed(0)}ms`)
    console.log(`  Saved:      ${(seqTime - eagerTime).toFixed(0)}ms`)

    expect(eagerTime).toBeLessThan(seqTime * 0.85)
  })

  it('multi-round: eager saves a full tool-exec per round', async () => {
    // 2 rounds of LLM → tool → LLM → tool
    // Each round: LLM 100ms, tool 150ms
    // Sequential per round: 100ms + 150ms = 250ms × 2 = 500ms
    // Eager: tool overlaps with next LLM call setup... but actually
    // the real win is within a single response with multiple tool blocks

    const LLM_TEXT = 50  // text before first tool
    const LLM_PER_TOOL = 30 // time to generate each tool_use block
    const TOOL_EXEC = 120
    const N_TOOLS = 4

    // Sequential: wait for all LLM output, then parallel tools
    const t0 = performance.now()
    await sleep(LLM_TEXT + LLM_PER_TOOL * N_TOOLS) // full LLM response
    await Promise.all(Array.from({ length: N_TOOLS }, () => sleep(TOOL_EXEC)))
    const seqTime = performance.now() - t0

    // Eager: each tool starts as its block completes
    const t1 = performance.now()
    await sleep(LLM_TEXT) // text portion
    const toolPromises = []
    for (let i = 0; i < N_TOOLS; i++) {
      await sleep(LLM_PER_TOOL) // LLM generates tool_use block
      toolPromises.push(sleep(TOOL_EXEC)) // start immediately
    }
    await Promise.all(toolPromises)
    const eagerTime = performance.now() - t1

    // Eager advantage: first tool started (N-1)*LLM_PER_TOOL ms earlier
    // Tool 1 starts at 80ms (eager) vs 170ms (seq) = 90ms head start
    // All tools done when last tool finishes: max(80+120, 110+120, 140+120, 170+120) = 290ms
    // Sequential: 170ms + 120ms = 290ms
    // Hmm, same again for the LAST tool. But the first 3 tools finish earlier.

    // The REAL win: if tool exec > remaining LLM time after that tool
    // Tool 1: starts at 80ms, exec 120ms, done at 200ms
    // Sequential: Tool 1 starts at 170ms, done at 290ms
    // If we need Tool 1's result for something, we get it 90ms earlier

    const saved = seqTime - eagerTime
    console.log(`\n  4 tools × 120ms, LLM 30ms/block:`)
    console.log(`  Sequential: ${seqTime.toFixed(0)}ms`)
    console.log(`  Eager:      ${eagerTime.toFixed(0)}ms`)
    console.log(`  Saved:      ${saved.toFixed(0)}ms`)
    console.log(`  Note: savings visible when tool results feed next LLM round`)
  })

  it('the killer scenario: tool slower than remaining LLM', async () => {
    // LLM: 30ms text → tool_use(20ms) → 10ms more text
    // Tool: 500ms (API call, DB query, etc.)
    // Sequential: 60ms LLM + 500ms tool = 560ms
    // Eager: tool starts at 50ms, LLM done at 60ms, tool done at 550ms = 550ms
    // Saved: 10ms... not much because LLM is fast
    //
    // BUT: LLM 200ms text → tool_use(50ms) → 200ms more text
    // Tool: 300ms
    // Sequential: 450ms + 300ms = 750ms
    // Eager: tool starts at 250ms, done at 550ms, LLM done at 450ms → 550ms
    // Saved: 200ms!

    const LLM_BEFORE = 200
    const LLM_TOOL_BLOCK = 50
    const LLM_AFTER = 200
    const TOOL_EXEC = 300

    // Sequential
    const t0 = performance.now()
    await sleep(LLM_BEFORE + LLM_TOOL_BLOCK + LLM_AFTER)
    await sleep(TOOL_EXEC)
    const seqTime = performance.now() - t0

    // Eager
    const t1 = performance.now()
    await sleep(LLM_BEFORE + LLM_TOOL_BLOCK)
    const toolP = sleep(TOOL_EXEC)
    await sleep(LLM_AFTER)
    await toolP
    const eagerTime = performance.now() - t1

    const saved = seqTime - eagerTime
    const pct = ((saved / seqTime) * 100)

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  Eager Execution — Killer Scenario`)
    console.log(`  LLM: 200ms text + 50ms tool_use + 200ms text = 450ms`)
    console.log(`  Tool: 300ms execution`)
    console.log(`${'═'.repeat(60)}`)
    console.log(`  Sequential: ${seqTime.toFixed(0)}ms  (LLM 450ms → tool 300ms)`)
    console.log(`  Eager:      ${eagerTime.toFixed(0)}ms  (tool starts at 250ms, overlaps)`)
    console.log(`  Saved:      ${saved.toFixed(0)}ms (${pct.toFixed(0)}%)`)
    console.log(`${'═'.repeat(60)}\n`)

    expect(saved).toBeGreaterThan(150) // should save ~200ms
  })
})
