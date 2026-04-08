// Provider factory — creates the right provider based on config

import type { ProviderConfig } from '../types.js'
import type { Provider } from '../types.js'
import { createAnthropicProvider } from './anthropic.js'
import { createOpenAIProvider } from './openai.js'

export function createProvider(config: ProviderConfig): Provider {
  const provider = config.provider ?? detectProvider(config)

  if (provider !== 'custom' && !config.apiKey) {
    throw new Error('apiKey is required for provider: ' + provider)
  }

  if (provider === 'anthropic' && config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid apiKey format for anthropic provider (expected sk-ant- prefix)')
  }
  if (provider === 'openai' && config.apiKey && !config.apiKey.startsWith('sk-')) {
    throw new Error('Invalid apiKey format for openai provider (expected sk- prefix)')
  }

  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider(config)
    case 'openai':
      return createOpenAIProvider(config)
    case 'custom':
      if (config.customProvider) return config.customProvider
      if (!config.baseUrl) throw new Error('customProvider or baseUrl is required when provider="custom"')
      return createOpenAIProvider(config)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

function detectProvider(config: ProviderConfig): string {
  if (!config.apiKey) throw new Error('apiKey is required')
  if (config.baseUrl?.includes('anthropic')) return 'anthropic'
  if (config.apiKey?.startsWith('sk-ant-')) return 'anthropic'
  return 'openai'
}

export { createAnthropicProvider } from './anthropic.js'
export { createOpenAIProvider } from './openai.js'
