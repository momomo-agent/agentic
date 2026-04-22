/**
 * agentic.bundle — All packages in one file for <script> tag usage
 *
 * Sets up globals so agentic's load() can find them:
 *   window.AgenticCore, window.AgenticConductor, window.AgenticStore, window.AgenticVoice
 */

// Import all packages
import * as AgenticCore from 'agentic-core'
import * as AgenticConductor from 'agentic-conductor'
import * as AgenticStore from 'agentic-store'
import * as AgenticVoice from 'agentic-voice'

// Register on globalThis so agentic's load() discovers them
if (typeof globalThis !== 'undefined') {
  globalThis.AgenticCore = AgenticCore
  globalThis.AgenticConductor = AgenticConductor
  globalThis.AgenticStore = AgenticStore
  globalThis.AgenticVoice = AgenticVoice
}

// Re-export the main entry
export { Agentic, ai } from '../packages/agentic/src/index.js'
