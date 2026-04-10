import { execFile } from 'node:child_process';
import { writeFile, unlink, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WHISPER_BIN = process.env.WHISPER_BIN || '/opt/homebrew/bin/whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || join(process.env.HOME, 'LOCAL/momo-agent/tools/whisper-models/ggml-small.bin');

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
