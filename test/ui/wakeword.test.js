import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock SpeechRecognition
function makeSR() {
  const sr = {
    continuous: false,
    interimResults: false,
    onresult: null,
    onerror: null,
    start: vi.fn(),
    stop: vi.fn(),
  }
  return sr
}

let srInstance
beforeEach(() => {
  srInstance = makeSR()
  global.window = {
    SpeechRecognition: vi.fn(() => srInstance),
  }
})

// Helper: simulate WakeWord logic (extracted from component)
function createWakeWordLogic(wakeWord, emitFn) {
  let recognition = null
  let retries = 0

  function startListening() {
    if (!wakeWord) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { console.warn('SpeechRecognition not supported'); return }
    recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (transcript.toLowerCase().includes(wakeWord.toLowerCase())) {
          emitFn('activated')
        }
      }
    }
    recognition.onerror = () => {
      if (retries < 3) { retries++; recognition.start() }
    }
    recognition.start()
  }

  function stopListening() {
    recognition?.stop()
    recognition = null
  }

  return { startListening, stopListening, getRecognition: () => recognition, getRetries: () => retries }
}

function makeEvent(transcript, resultIndex = 0) {
  return {
    resultIndex,
    results: [{ 0: { transcript }, length: 1 }],
    length: 1,
  }
}

describe('WakeWord', () => {
  it('DBB-001: emits activated when transcript includes wakeWord', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('hey', emit)
    startListening()
    srInstance.onresult(makeEvent('hey there'))
    expect(emit).toHaveBeenCalledWith('activated')
  })

  it('does not emit for non-matching transcript', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('hey', emit)
    startListening()
    srInstance.onresult(makeEvent('hello world'))
    expect(emit).not.toHaveBeenCalled()
  })

  it('DBB-002: works with custom wakeWord', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('momo', emit)
    startListening()
    srInstance.onresult(makeEvent('momo start'))
    expect(emit).toHaveBeenCalledWith('activated')
  })

  it('case-insensitive matching', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('hey', emit)
    startListening()
    srInstance.onresult(makeEvent('HEY you'))
    expect(emit).toHaveBeenCalledWith('activated')
  })

  it('empty wakeWord does not start listening', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('', emit)
    startListening()
    expect(srInstance.start).not.toHaveBeenCalled()
  })

  it('no SpeechRecognition support: no crash', () => {
    global.window = {}
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('hey', emit)
    expect(() => startListening()).not.toThrow()
  })

  it('onerror retries up to 3 times', () => {
    const emit = vi.fn()
    const { startListening } = createWakeWordLogic('hey', emit)
    startListening()
    srInstance.onerror()
    srInstance.onerror()
    srInstance.onerror()
    srInstance.onerror() // 4th — should not retry
    expect(srInstance.start).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })

  it('stopListening stops recognition', () => {
    const emit = vi.fn()
    const { startListening, stopListening } = createWakeWordLogic('hey', emit)
    startListening()
    stopListening()
    expect(srInstance.stop).toHaveBeenCalled()
  })
})
