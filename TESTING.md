# Agentic 测试规范

## 测试框架

- **单元测试**：Vitest（快速、ESM 原生支持）
- **覆盖率目标**：≥80% (statements/branches/functions/lines)
- **CI 集成**：GitHub Actions 自动跑测试

## 目录结构

```
packages/xxx/
├── src/xxx.js          # 源码
├── test/
│   ├── unit/           # 单元测试
│   │   ├── core.test.js
│   │   └── utils.test.js
│   ├── integration/    # 集成测试（可选）
│   └── fixtures/       # 测试数据
├── vitest.config.js
└── package.json
```

## 必测内容

### 1. 核心 API
- 所有 public 方法
- 边界条件（空输入、null、undefined）
- 错误处理（throw/reject）

### 2. 关键路径
- 主要使用场景的端到端流程
- 异步操作（Promise/async/await）
- 事件触发和监听

### 3. 边界情况
- 极端输入（超大/超小值）
- 并发调用
- 资源清理（cleanup/dispose）

## 测试模板

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgenticXXX } from '../src/xxx.js'

describe('AgenticXXX', () => {
  let instance

  beforeEach(() => {
    instance = new AgenticXXX()
  })

  afterEach(() => {
    instance?.dispose()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(instance).toBeDefined()
    })

    it('should accept custom config', () => {
      const custom = new AgenticXXX({ option: 'value' })
      expect(custom.config.option).toBe('value')
    })
  })

  describe('mainMethod', () => {
    it('should handle normal input', async () => {
      const result = await instance.mainMethod('input')
      expect(result).toBe('expected')
    })

    it('should throw on invalid input', () => {
      expect(() => instance.mainMethod(null)).toThrow()
    })
  })
})
```

## 覆盖率配置

```js
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
}
```

## 运行命令

```bash
pnpm test              # 跑所有测试
pnpm test:watch        # watch 模式
pnpm test:coverage     # 生成覆盖率报告
pnpm test:ui           # Vitest UI
```

## 特殊场景

### 浏览器 API（voice/sense/render）
- 用 happy-dom 或 jsdom mock
- 关键 API 用 vi.fn() stub

### 外部依赖（core 的 LLM 调用）
- Mock HTTP 请求（msw 或 vi.mock）
- 提供 fixture 响应数据

### 文件系统（filesystem/store）
- 用内存实现或临时目录
- 测试后清理

## CI 配置

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4  # 上传覆盖率
```
