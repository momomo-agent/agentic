export async function see(transport, image, prompt = 'Describe this image', options = {}) {
  const base64 = await toBase64(image)
  const body = { image: base64, prompt }

  if (options.stream) {
    return streamSee(transport, body)
  }

  let text = ''
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') text += chunk.text || ''
  }
  return text
}

async function* streamSee(transport, body) {
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') yield { type: 'content', text: chunk.text || '' }
  }
  yield { type: 'done' }
}

async function toBase64(input) {
  if (typeof input === 'string') return input
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return input.toString('base64')
  }
  if (input instanceof ArrayBuffer) {
    if (typeof Buffer !== 'undefined') return Buffer.from(input).toString('base64')
    return arrayBufferToBase64(input)
  }
  // Blob (browser)
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const ab = await input.arrayBuffer()
    if (typeof Buffer !== 'undefined') return Buffer.from(ab).toString('base64')
    return arrayBufferToBase64(ab)
  }
  throw new Error('Unsupported image input type')
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
