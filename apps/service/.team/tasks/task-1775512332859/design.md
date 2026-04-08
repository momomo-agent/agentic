# 技术设计 — 实现 src/runtime/memory.js

## 文件
- `src/runtime/memory.js` (修改)

## 接口
```js
export async function add(text: string): Promise<void>
export async function search(query: string, topK?: number): Promise<Array<{text, score}>>
export async function remove(key: string): Promise<void>
export { remove as delete }
```

## 依赖
- `./embed.js` — embed(text) → Float32Array
- `../store/index.js` — get(key), set(key, val), del(key)

## 逻辑
- `add(text)`: 串行化写入（_lock chain），embed → set(id, {text, vector}) → 更新索引
  - id 格式: `mem:{Date.now()}:{random}`
  - 索引 key: `mem:__index__`
- `search(query, topK=5)`: embed query → 余弦相似度 → 排序 → slice(0, topK)
- `remove(key)`: del(key) + 过滤索引

## 余弦相似度
```js
function cosine(a, b) // dot / (|a| * |b|)，分母为0返回0
```

## 边界情况
- 空 query：直接返回 `[]`
- embed 返回空数组：返回 `[]`
- 索引为空：返回 `[]`
- 并发 add：_lock 串行化保证索引一致

## 测试用例
- add() 后 search() 能找到相关内容
- remove() 后 search() 不再返回该条目
- 空 query 返回 []
- 并发 add 不破坏索引
