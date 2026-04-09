/**
 * Piper TTS — high-quality local neural TTS.
 * Auto-downloads piper binary + voice model on first use.
 */
import { execFile, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), '.agentic-service', 'piper');
const BIN_PATH = path.join(DATA_DIR, 'piper');
const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

// Default voice — good quality English
const DEFAULT_VOICE = 'en_US-amy-medium';
const VOICE_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0';

async function ensurePiper() {
  try {
    await fs.access(BIN_PATH, fs.constants.X_OK);
    return;
  } catch {}

  await fs.mkdir(DATA_DIR, { recursive: true });

  // Detect platform
  const platform = process.platform;
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';

  let url;
  if (platform === 'darwin') {
    url = `https://github.com/rhasspy/piper/releases/latest/download/piper_macos_${arch}.tar.gz`;
  } else if (platform === 'linux') {
    url = `https://github.com/rhasspy/piper/releases/latest/download/piper_linux_${arch}.tar.gz`;
  } else {
    throw new Error(`Piper not supported on ${platform}`);
  }

  console.log(`[piper] Downloading piper from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download piper: ${res.status}`);

  const tarPath = path.join(DATA_DIR, 'piper.tar.gz');
  await fs.writeFile(tarPath, Buffer.from(await res.arrayBuffer()));

  await new Promise((resolve, reject) => {
    execFile('tar', ['-xzf', tarPath, '-C', DATA_DIR, '--strip-components=1'], (err) => {
      if (err) reject(err); else resolve();
    });
  });
  await fs.unlink(tarPath).catch(() => {});
  console.log('[piper] Installed successfully');
}

async function ensureVoice(voiceName) {
  const voiceDir = path.join(DATA_DIR, 'voices');
  await fs.mkdir(voiceDir, { recursive: true });

  const onnxPath = path.join(voiceDir, `${voiceName}.onnx`);
  const jsonPath = path.join(voiceDir, `${voiceName}.onnx.json`);

  try {
    await fs.access(onnxPath);
    return onnxPath;
  } catch {}

  // Voice path format: en/en_US/amy/medium/en_US-amy-medium.onnx
  const parts = voiceName.split('-');
  const lang = parts[0];
  const locale = `${parts[0]}_${parts[1]}`;
  const name = parts[2];
  const quality = parts[3];
  const voicePath = `${lang}/${locale}/${name}/${quality}`;

  console.log(`[piper] Downloading voice ${voiceName}...`);
  for (const ext of ['.onnx', '.onnx.json']) {
    const url = `${VOICE_BASE}/${voicePath}/${voiceName}${ext}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${voiceName}${ext}: ${res.status}`);
    const dest = ext === '.onnx' ? onnxPath : jsonPath;
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  console.log(`[piper] Voice ${voiceName} ready`);
  return onnxPath;
}

export async function synthesize(text) {
  await ensurePiper();

  let voiceName = DEFAULT_VOICE;
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    if (config.tts?.voice && config.tts.voice !== 'default') voiceName = config.tts.voice;
  } catch {}

  const modelPath = await ensureVoice(voiceName);
  const outPath = path.join(os.tmpdir(), `piper-${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    const proc = spawn(BIN_PATH, ['--model', modelPath, '--output_file', outPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.stdin.write(text);
    proc.stdin.end();

    proc.on('close', async (code) => {
      if (code !== 0) return reject(new Error(`Piper exited ${code}: ${stderr}`));
      try {
        const buf = await fs.readFile(outPath);
        await fs.unlink(outPath).catch(() => {});
        resolve(buf);
      } catch (e) { reject(e); }
    });
  });
}
