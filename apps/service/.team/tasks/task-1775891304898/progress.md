# POST /v1/embeddings — OpenAI 兼容嵌入 API

## Progress

- Added POST /v1/embeddings to api.js
- Accepts `{ model, input }` where input is string or string[]
- Routes through runtime/embed.js (localEmbed)
- Response matches OpenAI format: `{ object: 'list', data: [{object: 'embedding', embedding, index}], model, usage }`
- Test: test/v1-embeddings.test.js — 4 tests passing
