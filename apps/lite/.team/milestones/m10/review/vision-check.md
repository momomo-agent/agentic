# m10 Vision Check — PRD Compliance (code_exec & Custom Provider)

**Timestamp:** 2026-04-07T20:20:15Z
**Vision Match:** 88%

## Vision Alignment

### ✅ Custom Provider Maintains Simplicity

Vision: "比 raw API 多一点，比 LangChain 轻得多"

**Evidence:**
- Custom provider support adds flexibility without complexity
- Two modes: `baseUrl` only (simple proxy) or `customProvider` (full control)
- API surface remains minimal: just add `provider: 'custom'` to config
- No framework abstractions introduced

**Implementation Quality:**
```typescript
// Simple baseUrl override
ask(prompt, { provider: 'custom', baseUrl: 'https://my-proxy.com', apiKey: 'key' })

// Full custom provider
ask(prompt, { provider: 'custom', customProvider: myProvider, apiKey: 'key' })
```

This aligns perfectly with "零框架概念，零配置负担"

### ✅ code_exec Evolution Supports Vision

Vision goal: "让 AI 以为自己在操作一台电脑"

**Current Implementation:**
- JavaScript + Python support with auto-detection
- Filesystem injection: AI can use `fs.readFileSync()` (JS) and `open()` (Python) naturally
- Sandboxed execution (quickjs-emscripten, Pyodide) maintains browser compatibility
- Node.js fallback uses child_process for Python

**Vision Alignment:** Strong - AI truly believes it's on a real computer

### ✅ shell_exec Tool Completes the Illusion

**Implementation:**
- `shell_exec` tool integrated via agentic-shell
- Works against virtual filesystem
- Supports common commands: ls, cat, grep, find, pwd, etc.
- `ShellResult` type properly added to AgenticResult interface

**Vision Impact:** Reinforces the "operating a computer" illusion

### ⚠️ Documentation Gaps (m10 Target)

**Gap 1: PRD.md code_exec description**
- Current: "executes JS via AsyncFunction (browser-compatible)"
- Reality: Uses quickjs-emscripten sandbox with Python support
- Impact: Medium - creates confusion about architecture

**Gap 2: PRD.md missing shell_exec**
- Tool is implemented and functional
- Not documented in PRD.md tools section
- Impact: Medium - incomplete documentation

**Gap 3: PRD.md AgenticResult incomplete**
- Missing `shellResults` field
- Types.ts has it, PRD doesn't
- Impact: Low - type definition is correct, just doc lag

**Gap 4: README.md too minimal**
- Only has installation section
- Missing: API examples, tool descriptions, quick start
- Impact: High - users can't understand how to use the library

### ✅ "No Heavy Runtime" Philosophy

Vision: "不依赖任何重型运行时"

**Analysis:**
- Browser: pure WASM (quickjs-emscripten, Pyodide) ✓
- Node.js: uses child_process for Python - acceptable tradeoff ✓
- Custom provider adds zero runtime overhead ✓
- All tools are optional and lazy-loaded ✓

**Verdict:** Vision maintained

## Specific Gaps Identified

1. **README.md** - Missing comprehensive documentation (88% → 95% if fixed)
2. **PRD.md code_exec** - Stale description needs update
3. **PRD.md shell_exec** - Tool not documented
4. **PRD.md AgenticResult** - Missing shellResults field

## Recommendations for m10 Completion

To achieve 95%+ vision match:

### 1. Update PRD.md code_exec section:
```markdown
- `code_exec` — executes JavaScript (quickjs-emscripten sandbox) or Python
  (Pyodide in browser, python3 subprocess in Node.js). Auto-detects language.
  Filesystem injection allows natural file I/O via fs.readFileSync/open().
```

### 2. Add shell_exec to PRD.md tools:
```markdown
- `shell_exec` — executes shell commands (ls, cat, grep, find, pwd) against
  the virtual filesystem via agentic-shell integration
```

### 3. Update PRD.md AgenticResult:
```typescript
{
  answer: string
  sources: Source[]
  images: string[]
  codeResults: CodeResult[]
  files: FileResult[]
  shellResults: ShellResult[]  // ADD THIS
  toolCalls: ToolCall[]
  usage: { input: number; output: number }
}
```

### 4. Expand README.md with:
- Quick start example
- API documentation for ask()
- Tool descriptions (search, code, file, shell)
- Configuration options
- Browser vs Node.js differences

## Vision Integrity: Strong ✓

The implementation is solid and aligns with the vision. The custom provider feature enhances flexibility while maintaining simplicity. All gaps are documentation-related, not implementation issues.

## Next Milestone Suggestion

After m10 completes PRD sync:
- **m11: Example Gallery** - showcase the "一个函数调用" promise with real examples
- **m12: Performance Optimization** - ensure browser bundle size stays minimal
- **m13: Advanced Tool Config** - allow users to customize tool behavior
