import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem';
import { executeCode } from './dist/tools/code.js';

const fs = new AgenticFileSystem({ storage: new MemoryStorage() });
const result = await executeCode({
  code: 'with open("/out.txt", "w") as f: f.write("test output")'
}, fs);

console.log('=== Result ===');
console.log('Output:', JSON.stringify(result.output));
console.log('Error:', result.error);

console.log('\n=== Filesystem check ===');
const r = await fs.read('/out.txt');
console.log('File content:', r.content);
console.log('File error:', r.error);
