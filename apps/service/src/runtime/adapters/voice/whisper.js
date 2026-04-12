import { execFile } from 'node:child_process';
import { writeFile, unlink, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Search common paths for whisper binary
const WHISPER_BIN_CANDIDATES = [
  process.env.WHISPER_BIN,
  '/opt/homebrew/bin/whisper-cpp',
  '/opt/homebrew/bin/whisper-cli',
  '/usr/local/bin/whisper-cpp',
  '/usr/local/bin/whisper',
].filter(Boolean);

const WHISPER_MODEL_CANDIDATES = [
  process.env.WHISPER_MODEL,
  '/opt/homebrew/share/whisper-cpp/models/ggml-small.bin',
  join(process.env.HOME, 'LOCAL/momo-agent/tools/whisper-models/ggml-small.bin'),
].filter(Boolean);

function findFirst(paths) {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return paths[0]; // fallback to first candidate
}

const WHISPER_BIN = findFirst(WHISPER_BIN_CANDIDATES);
const WHISPER_MODEL = findFirst(WHISPER_MODEL_CANDIDATES);

export async function check() {
  await access(WHISPER_BIN);
  await access(WHISPER_MODEL);
}

export async function transcribe(buffer) {
  const tmp = join(tmpdir(), `whisper-${Date.now()}.wav`);
  try {
    await writeFile(tmp, buffer);
    const text = await new Promise((resolve, reject) => {
      execFile(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', tmp, '--no-timestamps', '-l', 'auto'], 
        { timeout: 30000 }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout.trim());
        });
    });
    return text;
  } finally {
    unlink(tmp).catch(() => {});
  }
}
