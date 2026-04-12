/**
 * see() — Vision (image understanding)
 *
 * Usage:
 *   const { answer } = await ai.see(imageUrl, 'describe this')
 *   const { answer } = await ai.see(base64Data, 'what is this?', { stream: true })
 */
export function see(transport, image, prompt, options = {}) {
  const body = { prompt: prompt || 'Describe this image.' }

  if (typeof image === 'string') {
    if (image.startsWith('data:') || image.startsWith('http')) {
      body.image = image
    } else {
      // Assume base64
      body.image = `data:image/jpeg;base64,${image}`
    }
  } else if (image instanceof Blob) {
    // Convert blob to base64 — need async wrapper
    return blobToBase64See(transport, image, body, options)
  }

  if (options.model) body.model = options.model

  if (options.stream) {
    return makeAsyncIterablePromise(streamSee(transport, body))
  }
  return collectSee(transport, body)
}

async function blobToBase64See(transport, blob, body, options) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64')
  body.image = `data:${blob.type || 'image/jpeg'};base64,${b64}`

  if (options.model) body.model = options.model

  if (options.stream) {
    const gen = streamSee(transport, body)
    const result = { answer: '' }
    for await (const chunk of gen) {
      if (chunk.type === 'text_delta') result.answer += chunk.text
    }
    return result
  }
  return collectSee(transport, body)
}

async function collectSee(transport, body) {
  let text = ''
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') text += chunk.text || ''
  }
  return { answer: text }
}

async function* streamSee(transport, body) {
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') {
      yield { type: 'text_delta', text: chunk.text || '' }
    } else if (chunk.type === 'error') {
      yield { type: 'error', error: chunk.error || 'unknown error' }
    }
  }
  yield { type: 'done', stopReason: 'end_turn' }
}

function makeAsyncIterablePromise(asyncGen) {
  return {
    [Symbol.asyncIterator]() { return asyncGen },
    then(resolve, reject) { return Promise.resolve(asyncGen).then(resolve, reject) },
  }
}
