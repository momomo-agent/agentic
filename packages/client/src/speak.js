/**
 * speak() — Text-to-speech
 *
 * Usage:
 *   const audioBuffer = await ai.speak('hello')
 *   const audioBuffer = await ai.speak('hello', { voice: 'nova' })
 */
export async function speak(transport, text, options = {}) {
  const body = { text }
  if (options.voice) body.voice = options.voice
  if (options.speed) body.speed = options.speed
  return transport.postBinary('/api/synthesize', body)
}
