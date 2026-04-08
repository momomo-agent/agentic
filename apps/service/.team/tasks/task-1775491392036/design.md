# 技术设计: 实现 /api/config 持久化

## 文件
- `src/server/api.js` — 修改 `/api/config` GET/PUT 路由

## 存储路径
`~/.agentic-service/config.json`（与 profiles 缓存同目录）

## 函数签名

```js
// src/server/api.js
async function readConfig(): Promise<object>
async function writeConfig(data: object): Promise<void>
```

## 逻辑

```js
const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json')

async function readConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

async function writeConfig(data) {
  const tmp = CONFIG_PATH + '.tmp'
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(tmp, JSON.stringify(data, null, 2))
  await fs.rename(tmp, CONFIG_PATH)
}

router.get('/config', async (req, res) => {
  res.json(await readConfig())
})

router.put('/config', async (req, res) => {
  try {
    await writeConfig(req.body)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
```

## 边界情况
- 首次启动无文件：readConfig catch → 返回 `{}`
- 写入失败（磁盘满等）：返回 500
- PUT body 非 JSON：Express `express.json()` 中间件返回 400（需确认已挂载）

## 测试用例
- PUT config → GET config 返回相同值
- 删除 config.json → GET 返回 `{}`
- writeConfig 抛出 → PUT 返回 500
