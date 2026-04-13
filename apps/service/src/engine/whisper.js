/**
 * Whisper Engine — STT (speech-to-text)
 *
 * 内部使用 whisper.cpp 或 SenseVoice，对外统一为 whisper 引擎。
 * 模型管理由引擎自己负责，不走 Ollama。
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';

const WHISPER_MODELS = [
  { name: 'whisper:base', description: 'OpenAI Whisper Base — 快速', size: 150_000_000, capabilities: ['stt'] },
  { name: 'whisper:small', description: 'OpenAI Whisper Small — 均衡', size: 500_000_000, capabilities: ['stt'] },
  { name: 'whisper:medium', description: 'OpenAI Whisper Medium — 高精度', size: 1_500_000_000, capabilities: ['stt'] },
];

// Well-known install paths — PATH may not include /opt/homebrew/bin in daemon/nohup mode
const WHISPER_SEARCH_PATHS = [
  '/opt/homebrew/bin/whisper-cpp',
  '/opt/homebrew/bin/whisper-cli',
  '/opt/homebrew/bin/whisper',
  '/usr/local/bin/whisper-cpp',
  '/usr/local/bin/whisper',
];

function findWhisperBinary() {
  // 1. Check well-known paths first (works even when PATH is minimal)
  for (const p of WHISPER_SEARCH_PATHS) {
    if (existsSync(p)) return p;
  }
  // 2. Fall back to which (works when PATH is correct)
  try {
    return execSync('which whisper-cpp 2>/dev/null || which whisper-cli 2>/dev/null || which whisper 2>/dev/null', { stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

function whisperBinaryExists() {
  return !!findWhisperBinary();
}

function sensevoiceAvailable() {
  try {
    const res = execSync('curl -s --noproxy "*" -o /dev/null -w "%{http_code}" http://127.0.0.1:18906/health 2>/dev/null', { stdio: 'pipe', timeout: 2000 });
    return res.toString().trim() === '200';
  } catch {
    return false;
  }
}

export default {
  name: 'Whisper',

  async status() {
    const hasSenseVoice = sensevoiceAvailable();
    const hasWhisper = whisperBinaryExists();
    return {
      available: hasSenseVoice || hasWhisper,
      backend: hasSenseVoice ? 'sensevoice' : hasWhisper ? 'whisper-cpp' : null,
    };
  },

  async models() {
    const s = await this.status();
    const models = [];

    if (s.available) {
      if (s.backend === 'sensevoice') {
        models.push({ id: 'sensevoice', name: 'sensevoice', description: 'SenseVoice — 超快语音识别 (MPS)', capabilities: ['stt'], installed: true });
      } else {
        models.push(...WHISPER_MODELS.map(m => ({
          ...m,
          id: m.name,
          installed: true,
        })));
      }
    }

    // Cloud STT — always show
    models.push({ id: 'elevenlabs-stt', name: 'elevenlabs-stt', description: 'ElevenLabs Scribe — 云端语音识别', capabilities: ['stt'], installed: true, cloud: true });

    return models;
  },

  recommended() {
    return WHISPER_MODELS;
  },

  /**
   * Run STT transcription via the detected backend
   * @param {string} modelName - e.g. "sensevoice", "whisper:small"
   * @param {object} input - { audioBuffer: Buffer }
   * @returns {Promise<string>} transcribed text
   */
  async run(modelName, input) {
    if (modelName === 'elevenlabs-stt') {
      const { transcribe } = await import('../runtime/adapters/voice/elevenlabs-stt.js');
      return transcribe(input.audioBuffer);
    }

    const s = await this.status();
    if (!s.available) throw new Error('No STT backend available');

    if (s.backend === 'sensevoice' || modelName === 'sensevoice') {
      const { transcribe } = await import('../runtime/adapters/voice/sensevoice.js');
      return transcribe(input.audioBuffer);
    }
    // whisper-cpp
    const { transcribe } = await import('../runtime/adapters/voice/whisper.js');
    return transcribe(input.audioBuffer);
  },
};
