// Code execution tool — quickjs-emscripten isolated sandbox (Node) / AsyncFunction eval (browser)

import type { ToolDefinition } from 'agentic-core'
import type { CodeResult } from '../types.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

// Browser environment detection
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Code execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (result) => { clearTimeout(timer); resolve(result) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

// Pyodide instance cache (browser)
let pyodideInstance: any = null

function createFsWrapper(filesystem: AgenticFileSystem) {
  return {
    read: (path: string) => filesystem.read(path),
    write: (path: string, data: string) => filesystem.write(path, data),
  }
}

async function injectFilesystem(vm: any, filesystem?: AgenticFileSystem) {
  if (!filesystem) return
  const fsHandle = vm.newObject()

  const readFn = vm.newAsyncifiedFunction('readFileSync', async (pathHandle: any) => {
    const path = String(vm.dump(pathHandle))
    const result = await filesystem.read(path)
    if (result.error || !result.content) throw vm.newError(`ENOENT: no such file or directory, open '${path}'`)
    return vm.newString(result.content)
  })
  vm.setProp(fsHandle, 'readFileSync', readFn)
  readFn.dispose()

  const writeFn = vm.newAsyncifiedFunction('writeFileSync', async (pathHandle: any, dataHandle: any) => {
    const path = String(vm.dump(pathHandle))
    const data = String(vm.dump(dataHandle))
    const result = await filesystem.write(path, data)
    if (result.error) throw vm.newError(`EACCES: permission denied, write '${path}'`)
    return vm.undefined
  })
  vm.setProp(fsHandle, 'writeFileSync', writeFn)
  writeFn.dispose()

  vm.setProp(vm.global, 'fs', fsHandle)
  fsHandle.dispose()
}

function detectLanguage(code: string): 'python' | 'javascript' {
  const pythonPatterns = /\b(import|from|def|print|if __name__|class\s+\w+:|with\s+open)\b/
  return pythonPatterns.test(code) ? 'python' : 'javascript'
}

async function executeJavaScriptBrowser(code: string, filesystem?: AgenticFileSystem): Promise<CodeResult> {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    const logs: string[] = []
    const _console = { 
      log: (...a: any[]) => logs.push(a.join(' ')), 
      warn: (...a: any[]) => logs.push(a.join(' ')), 
      error: (...a: any[]) => logs.push(a.join(' ')) 
    }
    const fsWrapper = filesystem ? createFsWrapper(filesystem) : undefined
    const fn = new AsyncFunction('console', 'fs', `return (async () => { ${code} })()`)
    const result = await fn(_console, fsWrapper)
    const output = [...logs, ...(result !== undefined && result !== null ? [`→ ${String(result)}`] : [])].join('\n')
    return { code, output }
  } catch (err: any) {
    return { code, output: '', error: err.message || String(err) }
  }
}

async function executePythonBrowser(code: string, filesystem?: AgenticFileSystem): Promise<CodeResult> {
  if (!pyodideInstance) {
    try {
      // Load Pyodide from CDN in browser
      if (typeof window !== 'undefined' && !(window as any).loadPyodide) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js'
        document.head.appendChild(script)
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
        })
      }
      const loadPyodide = (window as any).loadPyodide || (await import('pyodide')).loadPyodide
      pyodideInstance = await loadPyodide()
      // Install common packages via micropip
      await pyodideInstance.loadPackage('micropip')
      const micropip = pyodideInstance.pyimport('micropip')
      await micropip.install(['numpy', 'matplotlib'])
    } catch (err: any) {
      return { code, output: '', error: `Pyodide unavailable: ${err.message || String(err)}` }
    }
  }

  try {
    if (filesystem) {
      pyodideInstance.globals.set('__filesystem__', {
        read: (path: string) => filesystem.read(path),
        write: (path: string, data: string) => filesystem.write(path, data),
      })
      await pyodideInstance.runPythonAsync(`
import io, js
_original_open = open
def open(file, mode='r', *args, **kwargs):
    if isinstance(file, str) and (file.startswith('/') or file.startswith('./')):
        fs = js.__filesystem__
        if 'r' in mode:
            result = fs.read(file)
            if result.error: raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(result.content)
        elif 'w' in mode:
            class W:
                def __init__(self, p): self.p=p; self.b=[]
                def write(self, d): self.b.append(str(d)); return len(d)
                def close(self): fs.write(self.p,''.join(self.b))
                def __enter__(self): return self
                def __exit__(self, *a): self.close()
            return W(file)
    return _original_open(file, mode, *args, **kwargs)
`)
    }

    const output: string[] = []
    pyodideInstance.setStdout({ batched: (text: string) => output.push(text) })
    const result = await pyodideInstance.runPythonAsync(code)
    const resultStr = result !== undefined && result !== null ? String(result) : ''
    return { code, output: [...output, ...(resultStr ? [`→ ${resultStr}`] : [])].join('\n') }
  } catch (err: any) {
    return { code, output: '', error: err.message || String(err) }
  }
}

async function buildFileMap(code: string, filesystem: AgenticFileSystem): Promise<Record<string, string>> {
  const paths = [...code.matchAll(/open\(\s*['"]([^'"]+)['"]/g)].map(m => m[1])
  const map: Record<string, string> = {}
  for (const p of paths) {
    const r = await filesystem.read(p)
    if (r.content) map[p] = r.content
    // normalize relative paths
    if (p.startsWith('./')) {
      const abs = p.slice(1) // './foo' -> '/foo'
      const r2 = await filesystem.read(abs)
      if (r2.content) map[p] = r2.content
    }
  }
  return map
}

async function executePythonNode(code: string, filesystem?: AgenticFileSystem, timeout?: number): Promise<CodeResult> {
  const { spawn } = await import('child_process')

  let fullCode = code
  if (filesystem) {
    const preamble = `
import sys as _sys, io, json as _json
_fs_data = _json.loads(_sys.stdin.readline())
class _FS:
    def __init__(self): self._w={}
    def read(self,p):
        d=_fs_data.get(p) or _fs_data.get('./'+p.lstrip('/'))
        return d
    def write(self,p,d): self._w[p]=d
    def flush(self):
        if self._w: print(f"__FS_WRITES__:{_json.dumps(self._w)}",flush=True)
_fs=_FS()
_open=open
def open(file,mode='r',*a,**k):
    if isinstance(file,str) and (file.startswith('/') or file.startswith('./')):
        if 'r' in mode:
            content=_fs.read(file)
            if content is None: raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(content)
        if 'w' in mode:
            class W:
                def __init__(self,p): self.p=p;self.b=[]
                def write(self,d): self.b.append(str(d));return len(d)
                def close(self): _fs.write(self.p,''.join(self.b))
                def __enter__(self): return self
                def __exit__(self,*a): self.close()
            return W(file)
    return _open(file,mode,*a,**k)
`
    const epilogue = `
_fs.flush()
`
    fullCode = preamble + '\n' + code + '\n' + epilogue
  }

  return new Promise(async (resolve) => {
    const proc = spawn('python3', ['-c', fullCode])
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = timeout && timeout > 0 ? setTimeout(() => {
      timedOut = true
      proc.kill('SIGTERM')
    }, timeout) : null

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', async (exitCode) => {
      if (timer) clearTimeout(timer)
      if (timedOut) {
        resolve({ code, output: '', error: `Code execution timed out after ${timeout}ms` })
        return
      }
      // Parse and apply filesystem writes
      const writeMatch = stdout.match(/__FS_WRITES__:(.+)$/m)
      if (writeMatch && filesystem) {
        try {
          const writes = JSON.parse(writeMatch[1]) as Record<string, string>
          for (const [path, data] of Object.entries(writes)) {
            await filesystem.write(path, data)
          }
          stdout = stdout.replace(/__FS_WRITES__:.+$/m, '').trim()
        } catch { /* ignore parse errors */ }
      }

      if (exitCode !== 0) {
        resolve({ code, output: stdout, error: stderr || `Exit code ${exitCode}` })
      } else {
        resolve({ code, output: stdout })
      }
    })

    proc.on('error', (err) => {
      resolve({ code, output: '', error: `Python not found: ${err.message}` })
    })

    // Write file map to stdin
    if (filesystem) {
      const fileMap = await buildFileMap(code, filesystem)
      proc.stdin.write(JSON.stringify(fileMap) + '\n')
      proc.stdin.end()
    }
  })
}

export const codeToolDef: ToolDefinition = {
  name: 'code_exec',
  description: 'Execute JavaScript or Python code. Auto-detects language. Returns console output and the last expression value.',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JavaScript or Python code to execute' },
    },
    required: ['code'],
  },
}

export async function executeCode(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
  timeout?: number,
): Promise<CodeResult> {
  const code = String(input.code ?? '')
  if (!code) return { code: '', output: '', error: 'No code provided' }

  const language = detectLanguage(code)

  if (language === 'python') {
    return isBrowser
      ? withTimeout(executePythonBrowser(code, filesystem), timeout)
      : executePythonNode(code, filesystem, timeout)
  }

  // JavaScript execution — use AsyncFunction in browser, quickjs in Node
  if (isBrowser) {
    return executeJavaScriptBrowser(code, filesystem, logs)
  }

  const hasAwait = /\bawait\b/.test(code)
  const logs: string[] = []

  function injectConsole(vm: { newObject: Function; newFunction: Function; setProp: Function; global: unknown; dump: Function }) {
    const consoleHandle = vm.newObject()
    for (const method of ['log', 'warn', 'error'] as const) {
      const fn = vm.newFunction(method, (...args: unknown[]) => {
        logs.push((args as any[]).map((h: any) => String(vm.dump(h))).join(' '))
      })
      vm.setProp(consoleHandle, method, fn)
      fn.dispose()
    }
    vm.setProp(vm.global, 'console', consoleHandle)
    consoleHandle.dispose()
  }

  function handleResult(result: any, vm: any): CodeResult {
    if (result.error) {
      const err = vm.dump(result.error)
      result.error.dispose()
      vm.dispose()
      const errMsg = err && typeof err === 'object' ? (err.message ?? err.name ?? JSON.stringify(err)) : String(err)
      return { code, output: logs.join('\n'), error: String(errMsg) }
    }
    const val = vm.dump(result.value)
    result.value.dispose()
    vm.dispose()
    const output = [
      ...logs,
      ...(val !== undefined && val !== null ? [`→ ${String(val)}`] : []),
    ].join('\n')
    return { code, output }
  }

  if (hasAwait || filesystem) {
    const { newAsyncContext } = await import('quickjs-emscripten')
    const vm = await newAsyncContext()
    injectConsole(vm as any)
    await injectFilesystem(vm as any, filesystem)
    const wrapped = `(async()=>{return(${code})})().then(v=>{globalThis.__asyncResult=v},e=>{globalThis.__asyncError=String(e)})`
    return withTimeout((async () => {
      const result = await vm.evalCodeAsync(wrapped)
      if (result.error) return handleResult(result, vm)
      result.value.dispose()
      ;(vm as any).runtime.executePendingJobs()
      const errHandle = vm.getProp(vm.global, '__asyncError')
      const errVal = vm.dump(errHandle)
      errHandle.dispose()
      if (errVal !== undefined) {
        vm.dispose()
        return { code, output: logs.join('\n'), error: String(errVal) }
      }
      const valHandle = vm.getProp(vm.global, '__asyncResult')
      const val = vm.dump(valHandle)
      valHandle.dispose()
      vm.dispose()
      const output = [
        ...logs,
        ...(val !== undefined && val !== null ? [`→ ${String(val)}`] : []),
      ].join('\n')
      return { code, output }
    })(), timeout)
  }

  const { getQuickJS } = await import('quickjs-emscripten')
  const QuickJS = await getQuickJS()
  const vm = QuickJS.newContext()
  injectConsole(vm as any)
  return withTimeout(new Promise<CodeResult>((resolve, reject) => {
    try {
      const result = vm.evalCode(code)
      resolve(handleResult(result, vm))
    } catch (e) { reject(e) }
  }), timeout)
}
