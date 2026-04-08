# Design: Ollama自动安装

## File to modify
`src/cli/setup.js`

## Changes

Add `isOllamaInstalled()` and `isModelPulled(model)` helpers, then update `runSetup()`.

### New helpers

```js
// Returns true if `ollama` binary is on PATH
async function isOllamaInstalled(): Promise<boolean>
  // impl: execa('which', ['ollama']).catch(() => false)

// Returns true if model appears in `ollama list` output
async function isModelPulled(model: string): Promise<boolean>
  // impl: parse stdout of spawn('ollama', ['list'])
```

### Install command by platform

```js
function getInstallCommand(platform: string): string
  // 'darwin' → 'brew install ollama'  (fallback: curl -fsSL https://ollama.ai/install.sh | sh)
  // 'linux'  → 'curl -fsSL https://ollama.ai/install.sh | sh'
  // other    → throw Error('unsupported platform for auto-install')
```

### Updated runSetup() Ollama block

```js
if (profile.llm.provider === 'ollama') {
  if (!await isOllamaInstalled()) {
    const spinner = ora('Installing Ollama...').start()
    await installOllama(getInstallCommand(hardware.platform))
    spinner.succeed('Ollama installed')
  }
  if (!await isModelPulled(profile.llm.model)) {
    await pullModel(profile.llm.model)   // existing function
  } else {
    console.log(chalk.green(`✓ Model ${profile.llm.model} already present`))
  }
}
```

## Error handling
- `installOllama` rejects on non-zero exit → propagates, ora fails with message
- `pullModel` rejects on non-zero exit → same
- Unsupported platform → throw with clear message before attempting install

## Dependencies
- `child_process.spawn` (already imported)
- No new npm deps needed

## Test cases
1. Ollama installed + model present → skip both steps
2. Ollama installed + model missing → only pull
3. Ollama missing → install then pull
4. Install fails → error printed, process exits non-zero
