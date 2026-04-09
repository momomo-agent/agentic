/**
 * macOS native TTS via `say` command.
 * Zero dependencies, works out of the box on any Mac.
 * Outputs WAV (16-bit PCM, 22050 Hz).
 */
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

export async function synthesize(text) {
  if (process.platform !== 'darwin')
    throw new Error('macOS say is only available on macOS');

  let voice = 'Samantha'; // default English voice
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    if (config.tts?.voice && config.tts.voice !== 'default') voice = config.tts.voice;
  } catch {}

  // Output AIFF first, then convert to WAV with afconvert (macOS built-in)
  const tmpAiff = path.join(os.tmpdir(), `tts-${Date.now()}.aiff`);
  const tmpWav = path.join(os.tmpdir(), `tts-${Date.now()}.wav`);

  await new Promise((resolve, reject) => {
    execFile('say', ['-v', voice, '-o', tmpAiff, text], (err) => {
      if (err) reject(err); else resolve();
    });
  });

  // Convert AIFF → WAV (PCM 16-bit, 22050 Hz)
  await new Promise((resolve, reject) => {
    execFile('afconvert', [tmpAiff, tmpWav, '-d', 'LEI16', '-f', 'WAVE', '-r', '22050'], (err) => {
      if (err) reject(err); else resolve();
    });
  });

  const buf = await fs.readFile(tmpWav);
  await Promise.all([
    fs.unlink(tmpAiff).catch(() => {}),
    fs.unlink(tmpWav).catch(() => {})
  ]);
  return buf;
}

/** List available voices */
export async function listVoices() {
  return new Promise((resolve, reject) => {
    execFile('say', ['-v', '?'], (err, stdout) => {
      if (err) return reject(err);
      const voices = stdout.trim().split('\n').map(line => {
        const match = line.match(/^(\S+)\s+(\S+)/);
        return match ? { name: match[1], locale: match[2] } : null;
      }).filter(Boolean);
      resolve(voices);
    });
  });
}
