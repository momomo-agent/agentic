# Design: 创建 profiles/default.json

## File
- `profiles/default.json` (create)

## Structure
```json
{
  "version": "1.0",
  "profiles": [
    {
      "id": "default",
      "match": { "gpu": "none" },
      "llm": { "provider": "ollama", "model": "gemma2:2b", "quantization": "q4" },
      "stt": { "provider": "sensevoice", "model": "small" },
      "tts": { "provider": "kokoro", "voice": "default" },
      "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
    }
  ]
}
```

## Usage
Loaded by `src/detector/profiles.js` `loadBuiltinProfiles()` as last-resort fallback:
```js
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const builtinPath = path.resolve(__dirname, '../../profiles/default.json');
return JSON.parse(await fs.readFile(builtinPath, 'utf8'));
```

## Edge Cases
- File must be valid JSON (no comments)
- `match: { gpu: "none" }` ensures it matches any CPU-only machine

## Test Cases
- `JSON.parse(fs.readFileSync('profiles/default.json'))` succeeds
- `getProfile({ gpu: { type: 'none' } })` returns this profile when remote/cache unavailable
