export async function capabilities(transport) {
  const status = await transport.get('/api/status')

  const ollamaRunning = status.ollama?.running === true
  const hasModels = (status.ollama?.models?.length || 0) > 0
  const hasStt = !!status.config?.stt || !!status.devices?.microphone
  const hasTts = !!status.config?.tts || !!status.devices?.speaker

  return {
    think: ollamaRunning && hasModels,
    listen: hasStt,
    speak: hasTts,
    see: ollamaRunning && hasModels,
    converse: ollamaRunning && hasModels && hasStt && hasTts
  }
}
