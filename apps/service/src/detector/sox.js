import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function isSoxInstalled() {
  try { await execAsync('which sox'); return true; } catch { return false; }
}

async function installSox() {
  const platform = process.platform;
  if (platform === 'darwin') {
    await execAsync('brew install sox').catch(() => {
      throw new Error('sox install failed — install Homebrew first: https://brew.sh');
    });
  } else if (platform === 'linux') {
    await execAsync('apt-get install -y sox 2>/dev/null || yum install -y sox 2>/dev/null').catch(e => {
      throw new Error('sox install failed: ' + e.message);
    });
  } else {
    throw new Error('sox auto-install not supported on Windows — install manually: https://sox.sourceforge.net');
  }
}

export async function ensureSox() {
  if (await isSoxInstalled()) return;
  await installSox();
}
