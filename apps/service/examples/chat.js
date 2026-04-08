/**
 * Example: LLM 流式对话
 *
 * 演示：
 * - 单轮对话
 * - 多轮对话（带 history）
 * - 流式输出（SSE）
 */

const BASE = process.env.BASE_URL || 'http://localhost:1234';

async function chat(message, history = []) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const chunk = JSON.parse(data);
        if (chunk.type === 'content') {
          process.stdout.write(chunk.content || chunk.text || '');
          fullResponse += chunk.content || chunk.text || '';
        }
      } catch {}
    }
  }

  return fullResponse;
}

async function main() {
  console.log('=== 单轮对话 ===\n');
  console.log('Q: 用一句话解释什么是向量数据库\n');
  console.log('A: ');
  const answer1 = await chat('用一句话解释什么是向量数据库');
  console.log('\n');

  console.log('=== 多轮对话 ===\n');
  const history = [
    { role: 'user', content: '用一句话解释什么是向量数据库' },
    { role: 'assistant', content: answer1 },
  ];
  console.log('Q: 给个实际应用场景\n');
  console.log('A: ');
  await chat('给个实际应用场景', history);
  console.log('\n');
}

main().catch(console.error);
