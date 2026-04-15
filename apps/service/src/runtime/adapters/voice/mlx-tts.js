/**
 * MLX-Audio TTS — Qwen3-TTS via mlx-audio (Apple Silicon native).
 *
 * Requires: `uv tool install --force "mlx-audio" --prerelease=allow`
 * Model: mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-8bit (~1.7GB)
 *
 * Features:
 * - Runs locally on Apple Silicon (MLX + Metal)
 * - Voice design via instruct prompt (no reference audio needed)
 * - Chinese + English + multilingual
 * - ~4-5s generation for short sentences on M4
 */
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');
const DEFAULT_MODEL = 'mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-8bit';
const MLX_TTS_BIN = 'mlx_audio.tts.generate';

// Proxy env vars that cause socksio errors — strip them for subprocess
const PROXY_VARS = ['ALL_PROXY', 'all_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'SOCKS_PROXY', 'socks_proxy'];

function cleanEnv() {
  const env = { ...process.env };
  for (const k of PROXY_VARS) delete env[k];
  return env;
}

/**
 * Check if mlx_audio.tts.generate is available
 */
export async function isAvailable() {
  return new Promise((resolve) => {
    execFile('which', [MLX_TTS_BIN], (err) => resolve(!err));
  });
}

/**
 * Check if the model is downloaded
 */
export async function isModelInstalled(model) {
  const modelId = model || DEFAULT_MODEL;
  // HuggingFace cache path: models--org--name
  const cacheName = `models--${modelId.replace(/\//g, '--')}`;
  const cachePath = path.join(os.homedir(), '.cache', 'huggingface', 'hub', cacheName);
  try {
    await fs.access(cachePath);
    const snapshots = await fs.readdir(path.join(cachePath, 'snapshots'));
    return snapshots.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get model info
 */
export async function getModelInfo() {
  const available = await isAvailable();
  const installed = available ? await isModelInstalled() : false;
  return {
    available,
    installed,
    model: DEFAULT_MODEL,
    binary: MLX_TTS_BIN,
  };
}

/**
 * Synthesize text to audio buffer
 * @param {string} text - Text to synthesize
 * @param {object} options - { instruct, voice, speed, language }
 * @returns {Promise<Buffer>} WAV audio buffer
 */
/**
 * Install mlx-audio tool and download model
 * Yields progress events as { step, status, detail }
 */
export async function install(onProgress) {
  const report = (step, status, detail) => {
    if (onProgress) onProgress({ step, status, detail });
  };

  // Step 1: Check/install uv
  const hasUv = await new Promise(r => execFile('which', ['uv'], e => r(!e)));
  if (!hasUv) {
    report('uv', 'installing', 'Installing uv via brew...');
    await new Promise((resolve, reject) => {
      execFile('brew', ['install', 'uv'], { timeout: 300_000 }, (err) => {
        if (err) reject(new Error(`Failed to install uv: ${err.message}`));
        else resolve();
      });
    });
  }
  report('uv', 'ok', 'uv available');

  // Step 2: Check/install mlx-audio
  const hasMlx = await isAvailable();
  if (!hasMlx) {
    report('mlx-audio', 'installing', 'Installing mlx-audio...');
    await new Promise((resolve, reject) => {
      execFile('uv', ['tool', 'install', '--force', 'mlx-audio', '--prerelease=allow'], {
        timeout: 600_000,
        env: cleanEnv(),
      }, (err, stdout, stderr) => {
        if (err) reject(new Error(`Failed to install mlx-audio: ${err.message}\n${stderr}`));
        else resolve();
      });
    });
  }
  report('mlx-audio', 'ok', 'mlx-audio installed');

  // Step 3: Download model
  const modelInstalled = await isModelInstalled();
  if (!modelInstalled) {
    report('model', 'downloading', `Downloading ${DEFAULT_MODEL}...`);
    // Use mlx_audio.tts.generate with a tiny text to trigger model download
    const outDir = path.join(os.tmpdir(), `mlx-tts-install-${Date.now()}`);
    await fs.mkdir(outDir, { recursive: true });
    await new Promise((resolve, reject) => {
      execFile(MLX_TTS_BIN, [
        '--model', DEFAULT_MODEL,
        '--text', 'test',
        '--output_path', outDir,
        '--audio_format', 'wav',
      ], {
        env: cleanEnv(),
        timeout: 600_000,
      }, async (err) => {
        await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
        if (err) reject(new Error(`Model download failed: ${err.message}`));
        else resolve();
      });
    });
  }
  report('model', 'ok', `${DEFAULT_MODEL} ready`);
  report('done', 'ok', 'MLX-TTS fully installed');
}

export async function synthesize(text, options = {}) {
  let config = {};
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw).mlxTts || {};
  } catch {}

  const model = config.model || DEFAULT_MODEL;
  const instruct = options.instruct || config.instruct || 'a warm, natural voice';
  const speed = options.speed || config.speed || '1.0';

  const outDir = path.join(os.tmpdir(), `mlx-tts-${Date.now()}`);
  await fs.mkdir(outDir, { recursive: true });

  const args = [
    '--model', model,
    '--text', text,
    '--instruct', instruct,
    '--output_path', outDir,
    '--audio_format', 'wav',
    '--speed', String(speed),
  ];

  if (options.voice) args.push('--voice', options.voice);

  return new Promise((resolve, reject) => {
    const proc = execFile(MLX_TTS_BIN, args, {
      env: cleanEnv(),
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }, async (err, stdout, stderr) => {
      if (err) {
        await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
        return reject(new Error(`mlx-tts failed: ${err.message}\n${stderr}`));
      }

      try {
        // mlx_audio outputs to outDir/audio_000.wav (or multiple files for long text)
        const files = await fs.readdir(outDir);
        const wavFiles = files.filter(f => f.endsWith('.wav')).sort();

        if (wavFiles.length === 0) {
          throw new Error('No audio output generated');
        }

        if (wavFiles.length === 1) {
          // Single file — return directly
          const buf = await fs.readFile(path.join(outDir, wavFiles[0]));
          await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
          resolve(buf);
        } else {
          // Multiple files — concatenate with ffmpeg
          const listFile = path.join(outDir, 'concat.txt');
          const concatContent = wavFiles.map(f => `file '${f}'`).join('\n');
          await fs.writeFile(listFile, concatContent);

          const outFile = path.join(outDir, 'combined.wav');
          execFile('ffmpeg', ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outFile], async (ffErr) => {
            if (ffErr) {
              // Fallback: just return first file
              const buf = await fs.readFile(path.join(outDir, wavFiles[0]));
              await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
              return resolve(buf);
            }
            const buf = await fs.readFile(outFile);
            await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
            resolve(buf);
          });
        }
      } catch (e) {
        await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
        reject(e);
      }
    });
  });
}
