/**
 * embed() — Text embeddings
 *
 * Usage:
 *   const { embeddings } = await ai.embed('hello world')
 *   const { embeddings } = await ai.embed(['hello', 'world'], { model: 'nomic-embed-text' })
 */
export async function embed(transport, input, options = {}) {
  const body = {
    input: Array.isArray(input) ? input : [input],
  }
  if (options.model) body.model = options.model

  const result = await transport.post('/v1/embeddings', body)
  return {
    embeddings: (result.data || []).map(d => d.embedding),
    model: result.model,
    usage: result.usage
  }
}
