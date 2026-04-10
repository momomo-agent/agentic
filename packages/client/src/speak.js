export async function speak(transport, text) {
  return transport.postBinary('/api/synthesize', { text })
}
