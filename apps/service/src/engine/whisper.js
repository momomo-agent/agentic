/**
 * Whisper Engine — STT (speech-to-text)
 *
 * 内部使用 whisper.cpp 或 SenseVoice，对外统一为 whisper 引擎。
 * 模型管理由引擎自己负责，不走 Ollama。
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';

const WHISPER_MODELS = [
  { name: 'whisper:base', description: 'OpenAI Whisper Base — 快速', size: '~150 MB', capabilities: ['stt'] },
  { name: 'whisper:small', description: 'OpenAI Whisper Small — 均衡', size: '~500 MB', capabilities: ['stt'] },
  { name: 'whisper:medium', description: 'OpenAI Whisper Medium — 高精度', size: '~1.5 GB', capabilities: ['stt'] },
];

function whisperBinaryExists() {
  try {
    execSync('which whisper-cpp 2>/dev/null || which whisper 2>/dev/null', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function sensevoiceAvailable() {
  try {
    const res = execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18906/health 2>/dev/null', { stdio: 'pipe', timeout: 2000 });
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
    if (!s.available) return [];

    if (s.backend === 'sensevoice') {
      return [{ id: 'sensevoice', name: 'sensevoice', description: 'SenseVoice — 超快语音识别 (MPS)', capabilities: ['stt'], installed: true }];
    }

    // whisper-cpp: list available model files
    return WHISPER_MODELS.map(m => ({
      ...m,
      id: m.name,
      installed: true, // simplified — actual check would look for model files
    }));
  },

  recommended() {
    return WHISPER_MODELS;
  },
};
