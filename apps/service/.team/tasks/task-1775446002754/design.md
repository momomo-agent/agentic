# Task: 基础 HTTP 服务 - Technical Design

## 目标
REST API 接受文本输入返回 LLM 回复，基于 agentic-core

## 文件结构
```
src/
├── runtime/
│   └── llm.js           # LLM 运行时（封装 agentic-core）
└── server/
    ├── api.js           # Express 服务器 + 路由
    └── middleware.js    # CORS, 错误处理等
```

## 核心接口

### src/server/api.js
```javascript
import express from 'express';
import cors from 'cors';
import { chat } from '../runtime/llm.js';
import { errorHandler } from './middleware.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

/**
 * POST /api/chat
 * Body: { message: string, history?: Message[] }
 * Response: Server-Sent Events (SSE) stream
 */
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message' });
  }

  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await chat(message, { history });

    for await (const chunk of stream) {
      // 发送 SSE 格式数据
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/status
 * Response: { hardware, profile, ollama }
 */
app.get('/api/status', async (req, res) => {
  const { detect } = await import('../detector/hardware.js');
  const hardware = await detect();

  // TODO: 加载当前配置
  const profile = {}; // 从 ~/.agentic-service/config.json 读取

  res.json({
    hardware,
    profile,
    ollama: {
      installed: true, // TODO: 实际检测
      models: []       // TODO: 实际查询
    }
  });
});

/**
 * GET /api/config
 * Response: 当前配置
 */
app.get('/api/config', async (req, res) => {
  // TODO: 从 ~/.agentic-service/config.json 读取
  res.json({});
});

/**
 * PUT /api/config
 * Body: 配置对象
 * Response: 更新后的配置
 */
app.put('/api/config', async (req, res) => {
  // TODO: 验证并保存到 ~/.agentic-service/config.json
  res.json(req.body);
});

// 错误处理
app.use(errorHandler);

/**
 * 启动服务器
 * @param {number} port
 * @returns {Promise<Server>}
 */
export async function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(error);
      }
    });
  });
}
```

### src/runtime/llm.js
```javascript
/**
 * LLM 对话（本地优先，云端 fallback）
 * @param {string} message - 用户消息
 * @param {ChatOptions} options
 * @returns {AsyncGenerator<ChatChunk>}
 */
export async function* chat(message, options = {}) {
  const { history = [] } = options;

  // 构建消息列表
  const messages = [
    ...history,
    { role: 'user', content: message }
  ];

  // 1. 尝试本地 Ollama
  try {
    yield* chatWithOllama(messages);
    return;
  } catch (error) {
    console.warn('Ollama failed, falling back to cloud:', error.message);
  }

  // 2. Fallback 到云端 API
  yield* chatWithFallback(messages);
}

/**
 * 使用 Ollama 对话
 * @param {Message[]} messages
 * @returns {AsyncGenerator<ChatChunk>}
 */
async function* chatWithOllama(messages) {
  const config = await loadConfig();
  const { model } = config.llm;

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    }),
    signal: AbortSignal.timeout(30000) // 30s 超时
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield {
            type: 'content',
            content: data.message.content,
            done: data.done || false
          };
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
}

/**
 * 使用云端 API 对话
 * @param {Message[]} messages
 * @returns {AsyncGenerator<ChatChunk>}
 */
async function* chatWithFallback(messages) {
  const config = await loadConfig();
  const { provider, model } = config.fallback;

  if (provider === 'openai') {
    yield* chatWithOpenAI(messages, model);
  } else {
    throw new Error(`Unsupported fallback provider: ${provider}`);
  }
}

/**
 * 使用 OpenAI API 对话
 * @param {Message[]} messages
 * @param {string} model
 * @returns {AsyncGenerator<ChatChunk>}
 */
async function* chatWithOpenAI(messages, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6); // 移除 "data: "
      if (data === '[DONE]') break;

      try {
        const json = JSON.parse(data);
        const content = json.choices[0]?.delta?.content;
        if (content) {
          yield {
            type: 'content',
            content,
            done: false
          };
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
}

/**
 * 加载配置
 * @returns {Promise<Config>}
 */
async function loadConfig() {
  // TODO: 从 ~/.agentic-service/config.json 读取
  return {
    llm: { provider: 'ollama', model: 'gemma4:26b' },
    fallback: { provider: 'openai', model: 'gpt-4o-mini' }
  };
}

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatOptions
 * @property {Message[]} [history]
 */

/**
 * @typedef {Object} ChatChunk
 * @property {'content'|'error'} type
 * @property {string} content
 * @property {boolean} done
 */
```

### src/server/middleware.js
```javascript
/**
 * 错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  console.error('Server error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}
```

## 依赖
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

## API 规范

### POST /api/chat
**Request:**
```json
{
  "message": "Hello, how are you?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

**Response (SSE):**
```
data: {"type":"content","content":"I'm","done":false}

data: {"type":"content","content":" doing","done":false}

data: {"type":"content","content":" well!","done":true}

data: [DONE]
```

### GET /api/status
**Response:**
```json
{
  "hardware": {
    "platform": "darwin",
    "arch": "arm64",
    "gpu": { "type": "apple-silicon", "vram": 16 },
    "memory": 16,
    "cpu": { "cores": 10, "model": "Apple M4" }
  },
  "profile": {
    "llm": { "provider": "ollama", "model": "gemma4:26b" }
  },
  "ollama": {
    "installed": true,
    "models": ["gemma4:26b", "llama2:7b"]
  }
}
```

## 错误处理
- 端口占用 → 抛出错误，由 CLI 处理
- Ollama 超时 → 自动切换到 fallback
- 无效请求 → 返回 400 错误
- 服务器错误 → 返回 500 错误

## 测试用例

### 单元测试 (test/server/api.test.js)
```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { startServer } from '../../src/server/api.js';

describe('POST /api/chat', () => {
  it('should return streaming response', async () => {
    const server = await startServer(3001);

    const response = await request(server)
      .post('/api/chat')
      .send({ message: 'Hello' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(response.text).toContain('data:');

    server.close();
  });

  it('should reject invalid message', async () => {
    const server = await startServer(3002);

    await request(server)
      .post('/api/chat')
      .send({})
      .expect(400);

    server.close();
  });
});
```

## 性能要求
- 服务启动 < 3s
- 首 token 延迟 < 2s（本地模型）
- 内存占用 < 500MB（不含 Ollama）
