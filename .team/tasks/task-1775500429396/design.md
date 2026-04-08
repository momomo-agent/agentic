# Task Design — Ollama 自动安装执行

## 文件
- `src/cli/setup.js` — 修改 `runSetup()`，将打印安装命令改为自动执行

## 当前问题
`setupOllama()` 返回 `needsInstall=true` 时，setup.js 仅打印命令后 `process.exit(0)`，未实际执行安装。

## 修改方案

### 新增 installOllama(cmd): Promise<void>
```js
// src/cli/setup.js — 新增
import { spawn } from 'child_process';

async function installOllama(cmd) {
  await new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', cmd], { stdio: 'inherit' });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`install failed: ${code}`)));
  });
}
```

### 新增 pullModel(model): Promise<void>
```js
async function pullModel(model) {
  const spinner = ora(`Pulling model ${model}...`).start();
  await new Promise((resolve, reject) => {
    const child = spawn('ollama', ['pull', model], { stdio: 'inherit' });
    child.on('close', code => {
      code === 0 ? spinner.succeed(`Model ${model} ready`) : reject(new Error(`pull failed: ${code}`));
      if (code === 0) resolve();
    });
  });
}
```

### runSetup() 中替换 needsInstall 分支
```js
if (ollamaStatus.needsInstall) {
  const installSpinner = ora('Installing Ollama...').start();
  await installOllama(ollamaStatus.installCommand);
  installSpinner.succeed('Ollama installed');
  await pullModel(profile.llm.model);
}
```

## 边界情况
- 安装命令非零退出 → throw Error，setup 中断打印错误
- 模型拉取失败 → throw Error，提示手动运行 `ollama pull <model>`
- `needsInstall=false` → 跳过，无变化

## 测试用例
1. `needsInstall=true` → `installOllama` 和 `pullModel` 均被调用
2. `installOllama` 退出码非零 → Promise reject
3. `needsInstall=false, ready=true` → 跳过安装直接继续
