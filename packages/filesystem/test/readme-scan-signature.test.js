// Test: README custom storage scan() signature matches actual interface
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

const readme = readFileSync(join(__dirname, '../README.md'), 'utf8')

// The correct scan() return type must include 'line: number'
const hasCorrectSignature = readme.includes('line: number')
const hasOldSignature = /scan.*Promise.*Array.*path.*content[^l]/.test(readme.replace(/\n/g, ' '))

console.log('Has line: number in scan signature:', hasCorrectSignature)
console.log('Has old signature (missing line):', hasOldSignature)

if (!hasCorrectSignature) {
  console.error('FAIL: README scan() signature missing "line: number" field')
  process.exit(1)
}

// Check the specific custom storage example section
const customStorageMatch = readme.match(/class MyCustomStorage[\s\S]*?scan\(pattern[^\n]*\n/)
if (customStorageMatch) {
  const scanLine = customStorageMatch[0].split('\n').find(l => l.includes('scan('))
  console.log('Custom storage scan line:', scanLine?.trim())
  if (!scanLine?.includes('line')) {
    console.error('FAIL: Custom storage example scan() missing "line: number"')
    process.exit(1)
  }
}

console.log('PASS: README scan() signature is correct')
