import { embed as agenticEmbed } from 'agentic-embed'

export async function embed(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')
  if (text === '') return []
  return agenticEmbed(text)
}
