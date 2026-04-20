import { startServer } from './src/server/api.js';
const port = parseInt(process.argv[2] || '1234');
const server = await startServer(port, { https: false });
console.log(`agentic-service running on http://localhost:${port}`);
process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
