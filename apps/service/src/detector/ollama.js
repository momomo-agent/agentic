import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function isOllamaInstalled() {
  try {
    await execAsync('which ollama');
    return true;
  } catch {
    return false;
  }
}

async function installOllama() {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') {
    cmd = 'winget install Ollama.Ollama';
  } else {
    cmd = 'curl -fsSL https://ollama.ai/install.sh | sh';
  }
  const { stderr } = await execAsync(cmd).catch(e => { throw new Error('Ollama install failed: ' + e.stderr); });
  return stderr;
}

async function pullModel(model, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['pull', model], { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', d => onProgress && onProgress(d.toString().trim()));
    proc.on('close', code => code === 0 ? resolve() : reject(new Error('Model pull failed: exit ' + code)));
  });
}

export async function ensureOllama(model, onProgress) {
  if (!(await isOllamaInstalled())) {
    await installOllama();
  }
  await pullModel(model, onProgress);
}
