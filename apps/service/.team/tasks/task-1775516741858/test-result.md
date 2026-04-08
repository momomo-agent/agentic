# Test Result: Ollama自动安装 + 模型拉取

## Summary
- Total: 10 | Passed: 10 | Failed: 0

## Results
- ✅ exports ensureOllama function
- ✅ checks for ollama binary via which
- ✅ uses curl install script for darwin/linux
- ✅ uses winget for win32
- ✅ throws on install failure with stderr message
- ✅ runs ollama pull with model arg
- ✅ pipes stdout to onProgress callback
- ✅ throws on non-zero exit code
- ✅ skips install when ollama already installed
- ✅ throws error when pull fails

## DBB Verification
- ✅ ensureOllama() detects binary, auto-installs if missing
- ✅ ollama pull <model> executed with progress streaming
- ✅ install failure throws with stderr message
- ✅ unit tests cover: already installed / not installed / pull failure

## Edge Cases
- win32 install path only tested via source inspection (no live winget env)
- onProgress called with trimmed stdout lines (no newline stripping test)
