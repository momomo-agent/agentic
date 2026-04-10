# Fix embed.js build failure — localEmbed import does not exist in agentic-embed

## Progress

### Investigation
- `agentic-embed` is a CJS UMD package (no `"type": "module"` in package.json)
- It exports `{ create, chunkText, cosineSimilarity, localEmbed }` via `module.exports = factory()`
- `agentic-service` is ESM (`"type": "module"`)
- Named ESM imports from CJS UMD don't work: `import { localEmbed } from 'agentic-embed'` → SyntaxError

### Fix Already Applied
The code in `src/runtime/embed.js` has already been fixed to use default import + destructure:
```js
import agenticEmbedPkg from 'agentic-embed'
const { localEmbed: agenticEmbed } = agenticEmbedPkg
```

### Verification
- `node -e "import('./src/runtime/embed.js')"` → OK, exports `embed`
- `node -e "import('./src/index.js')"` → OK, all exports including `embed`
- All embed tests pass (test/runtime/embed.test.js, test/m76-embed-wiring.test.js, test/m64-agentic-embed.test.js)
- Full test suite: 165/166 files pass, 841/845 tests pass (4 failures in unrelated m95-architecture-docs.test.js)
