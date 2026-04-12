/**
 * Example: 硬件检测
 *
 * 演示：
 * - 自动检测 GPU 类型（Apple Silicon / NVIDIA / CPU-only）
 * - 检测内存、CPU 核心数
 * - 获取推荐模型配置
 * - 查看已安装的 Ollama 模型
 */

const BASE = process.env.BASE_URL || 'http://localhost:1234';

async function main() {
  const res = await fetch(`${BASE}/api/status`);
  const status = await res.json();

  console.log('=== 硬件检测 ===\n');
  const hw = status.hardware;
  console.log(`  平台:    ${hw.platform} (${hw.arch})`);
  console.log(`  GPU:     ${hw.gpu.type} (${hw.gpu.vram}GB VRAM)`);
  console.log(`  内存:    ${hw.memory}GB`);
  console.log(`  CPU:     ${hw.cpu.model} (${hw.cpu.cores} cores)`);

  console.log('\n=== 推荐配置 ===\n');
  const cfg = status.config;
  if (cfg?.llm) {
    console.log(`  LLM:     ${cfg.llm.provider} / ${cfg.llm.model}`);
    console.log(`  STT:     ${cfg.stt?.provider || 'N/A'} / ${cfg.stt?.model || 'N/A'}`);
    console.log(`  TTS:     ${cfg.tts?.provider || 'N/A'} / ${cfg.tts?.voice || 'N/A'}`);
  } else {
    console.log('  (no config loaded)');
  }

  console.log('\n=== Ollama 模型 ===\n');
  if (status.ollama.running) {
    console.log(`  状态: 运行中`);
    console.log(`  已安装模型 (${status.ollama.models.length}):`);
    for (const m of status.ollama.models) {
      console.log(`    - ${m}`);
    }
  } else {
    console.log('  Ollama 未运行');
  }

  console.log('\n=== 连接设备 ===\n');
  console.log(`  设备数: ${status.devices.length}`);
  for (const d of status.devices) {
    console.log(`    - ${d.name || d.id} (${d.type})`);
  }
}

main().catch(console.error);
