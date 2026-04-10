import agenticEmbedPkg from 'agentic-embed'
const { localEmbed: agenticEmbed } = agenticEmbedPkg

export async function embed(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')
  if (text === '') return []
  return agenticEmbed(text)
}
