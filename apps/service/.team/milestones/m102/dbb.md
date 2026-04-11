# M102 DBB — OpenAI 兼容 API 全覆盖

## F1: `/v1/embeddings`

### DBB-001: 单字符串嵌入请求
- Requirement: F1 (POST /v1/embeddings)
- Given: POST `/v1/embeddings` with `{ "model": "bge-m3", "input": "hello world" }`
- Expect: 200, response body `{ object: "list", data: [{ object: "embedding", embedding: [number, ...], index: 0 }], model: "bge-m3", usage: { prompt_tokens: <int>, total_tokens: <int> } }`
- Verify: `data` array length is 1, `embedding` is a non-empty float array, `index` is 0

### DBB-002: 批量字符串嵌入请求
- Requirement: F1 (input 为 string[])
- Given: POST `/v1/embeddings` with `{ "model": "bge-m3", "input": ["hello", "world", "foo"] }`
- Expect: 200, `data` array length is 3, each item has correct `index` (0, 1, 2) and non-empty `embedding`
- Verify: `data[0].index === 0`, `data[1].index === 1`, `data[2].index === 2`

### DBB-003: 嵌入请求缺少 input 字段
- Requirement: F1 (请求验证)
- Given: POST `/v1/embeddings` with `{ "model": "bge-m3" }` (no input field)
- Expect: 400 error, response body contains error message indicating missing input
- Verify: HTTP status 400, `error.message` mentions "input"

### DBB-004: 嵌入请求空字符串
- Requirement: F1 (边界条件)
- Given: POST `/v1/embeddings` with `{ "model": "bge-m3", "input": "" }`
- Expect: 400 error or valid embedding (implementation decides), but must not 500
- Verify: Response is either a valid embedding response or a 4xx error with clear message

### DBB-005: 嵌入请求空数组
- Requirement: F1 (边界条件)
- Given: POST `/v1/embeddings` with `{ "model": "bge-m3", "input": [] }`
- Expect: 400 error or empty data array, must not 500
- Verify: Response is either `{ data: [] }` or a 4xx error with clear message

### DBB-006: 嵌入请求不存在的模型
- Requirement: F1 (错误处理)
- Given: POST `/v1/embeddings` with `{ "model": "nonexistent-model", "input": "test" }`
- Expect: 404 or 400 error indicating model not found
- Verify: HTTP status 4xx, error message mentions model not found or unavailable

### DBB-007: OpenAI SDK 兼容性 — embeddings
- Requirement: F1 验收标准 (OpenAI Python SDK 直接调通)
- Given: OpenAI Python SDK `openai.embeddings.create(model="bge-m3", input="hello")` pointing at service
- Expect: SDK returns without error, result has `data[0].embedding` as list of floats
- Verify: No SDK-side parsing errors, response matches OpenAI Embedding object schema

## F2: `/v1/audio/transcriptions`

### DBB-008: 音频转写基本请求
- Requirement: F2 (POST /v1/audio/transcriptions)
- Given: POST `/v1/audio/transcriptions` multipart/form-data with `file` = valid WAV audio
- Expect: 200, response body `{ text: "<transcribed text>" }`
- Verify: `text` field is a non-empty string

### DBB-009: 音频转写指定 model 和 language
- Requirement: F2 (可选 model/language 参数)
- Given: POST `/v1/audio/transcriptions` with `file` + `model=whisper` + `language=en`
- Expect: 200, transcription returned using specified model
- Verify: Response contains `text` field

### DBB-010: 音频转写 verbose_json 格式
- Requirement: F2 (verbose JSON 响应格式)
- Given: POST `/v1/audio/transcriptions` with `file` + `response_format=verbose_json`
- Expect: 200, response body `{ task, language, duration, text, segments: [...] }`
- Verify: Response contains `task`, `language`, `duration`, `text`, `segments` fields

### DBB-011: 音频转写缺少 file 字段
- Requirement: F2 (请求验证)
- Given: POST `/v1/audio/transcriptions` with no file attached
- Expect: 400 error indicating missing audio file
- Verify: HTTP status 400, error message mentions "file"

### DBB-012: 音频转写无效文件格式
- Requirement: F2 (错误处理)
- Given: POST `/v1/audio/transcriptions` with `file` = a text file renamed to .wav
- Expect: 400 or 422 error indicating invalid audio format
- Verify: HTTP status 4xx, error message indicates format issue, not 500

### DBB-013: OpenAI SDK 兼容性 — transcriptions
- Requirement: F2 验收标准 (OpenAI Python SDK 直接调通)
- Given: OpenAI Python SDK `openai.audio.transcriptions.create(model="whisper", file=audio_file)` pointing at service
- Expect: SDK returns without error, result has `text` field
- Verify: No SDK-side parsing errors, response matches OpenAI Transcription object schema

## F3: `/v1/audio/speech`

### DBB-014: 语音合成基本请求
- Requirement: F3 (POST /v1/audio/speech)
- Given: POST `/v1/audio/speech` with `{ "model": "kokoro", "input": "Hello world", "voice": "default" }`
- Expect: 200, response is audio binary stream
- Verify: Content-Type is audio/* (e.g., audio/mpeg, audio/wav), response body is non-empty binary

### DBB-015: 语音合成指定 response_format
- Requirement: F3 (response_format 参数)
- Given: POST `/v1/audio/speech` with `{ "model": "kokoro", "input": "test", "voice": "default", "response_format": "wav" }`
- Expect: 200, Content-Type is `audio/wav`
- Verify: Content-Type header matches requested format

### DBB-016: 语音合成指定 mp3 格式
- Requirement: F3 (response_format 参数)
- Given: POST `/v1/audio/speech` with `response_format: "mp3"`
- Expect: 200, Content-Type is `audio/mpeg`
- Verify: Content-Type header is `audio/mpeg`, body is non-empty

### DBB-017: 语音合成缺少 input 字段
- Requirement: F3 (请求验证)
- Given: POST `/v1/audio/speech` with `{ "model": "kokoro", "voice": "default" }` (no input)
- Expect: 400 error indicating missing input text
- Verify: HTTP status 400, error message mentions "input"

### DBB-018: 语音合成空 input
- Requirement: F3 (边界条件)
- Given: POST `/v1/audio/speech` with `{ "model": "kokoro", "input": "", "voice": "default" }`
- Expect: 400 error indicating empty input, must not 500
- Verify: HTTP status 400, clear error message

### DBB-019: 语音合成不存在的模型
- Requirement: F3 (错误处理)
- Given: POST `/v1/audio/speech` with `{ "model": "nonexistent", "input": "test", "voice": "default" }`
- Expect: 404 or 400 error indicating model not found
- Verify: HTTP status 4xx, error message mentions model

### DBB-020: 语音合成 speed 参数
- Requirement: F3 (speed 参数)
- Given: POST `/v1/audio/speech` with `{ "model": "kokoro", "input": "test", "voice": "default", "speed": 1.5 }`
- Expect: 200, audio returned (speed applied if engine supports it)
- Verify: Response is valid audio, no error

### DBB-021: OpenAI SDK 兼容性 — speech
- Requirement: F3 验收标准 (OpenAI Python SDK 直接调通)
- Given: OpenAI Python SDK `openai.audio.speech.create(model="kokoro", input="hello", voice="default")` pointing at service
- Expect: SDK returns without error, result is streamable audio content
- Verify: No SDK-side parsing errors, audio content is non-empty

## F4: `/v1/models` 扩展

### DBB-022: models 列表包含 embedding 模型
- Requirement: F4 (GET /v1/models 列出 embedding 模型)
- Given: GET `/v1/models` when embedding engine is registered
- Expect: Response `data` array includes embedding model entries with `object: "model"`, `id`, `created`, `owned_by`
- Verify: At least one model in `data` corresponds to an embedding model

### DBB-023: models 列表包含 audio 模型
- Requirement: F4 (GET /v1/models 列出 audio 模型)
- Given: GET `/v1/models` when STT and TTS engines are registered
- Expect: Response `data` array includes STT and TTS model entries
- Verify: Models for whisper/sensevoice (STT) and kokoro/piper (TTS) appear in the list

### DBB-024: models 响应格式符合 OpenAI 标准
- Requirement: F4 (OpenAI 兼容格式)
- Given: GET `/v1/models`
- Expect: `{ object: "list", data: [{ id, object: "model", created, owned_by }, ...] }`
- Verify: Every item in `data` has `id` (string), `object` === "model", `created` (number), `owned_by` (string)

## 跨功能验证

### DBB-025: 所有新端点返回 JSON 错误格式
- Requirement: 全部 F1-F4 (统一错误格式)
- Given: Any invalid request to `/v1/embeddings`, `/v1/audio/transcriptions`, `/v1/audio/speech`
- Expect: Error response is JSON `{ error: { message, type, code } }` matching OpenAI error format
- Verify: All error responses parse as JSON with `error.message` field

### DBB-026: 所有新端点不接受 GET 请求
- Requirement: F1-F3 (HTTP 方法限制)
- Given: GET `/v1/embeddings`, GET `/v1/audio/transcriptions`, GET `/v1/audio/speech`
- Expect: 405 Method Not Allowed or 404
- Verify: None of these return 200

### DBB-027: 现有 chat completions 无回归
- Requirement: 验收标准 (不破坏现有功能)
- Given: POST `/v1/chat/completions` with valid chat request
- Expect: Same behavior as before M102 changes
- Verify: Response format unchanged, streaming still works, no regressions

### DBB-028: 所有现有测试通过
- Requirement: 验收标准 (所有新 API 有对应测试)
- Given: Run full test suite
- Expect: All tests pass (0 failures), including new tests for F1-F4
- Verify: Test runner exit code 0
