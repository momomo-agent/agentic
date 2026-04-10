import { buildSync } from 'esbuild'
import { readFileSync, writeFileSync, unlinkSync, copyFileSync } from 'fs'

buildSync({
  entryPoints: ['src/client.js'],
  bundle: true,
  format: 'cjs',
  outfile: '.tmp-bundle.cjs',
  platform: 'neutral'
})

let bundled = readFileSync('.tmp-bundle.cjs', 'utf8')
unlinkSync('.tmp-bundle.cjs')

// Replace esbuild's module.exports with _m.exports to avoid clashing with UMD outer scope
bundled = bundled.replace(/module\.exports/g, '_m.exports')

const umd = `;(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else { var e = factory(); root.AgenticClient = e; for (var k in e) root[k] = e[k] }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {
  'use strict'
  var _m = { exports: {} }, exports = _m.exports;
${bundled}
  return _m.exports;
});
`

writeFileSync('agentic-client.cjs', umd)
copyFileSync('agentic-client.cjs', 'agentic-client.js')
console.log('Built agentic-client.cjs + agentic-client.js (UMD)')
