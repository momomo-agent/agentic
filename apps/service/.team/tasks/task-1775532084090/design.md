# Task: Implement SIGINT graceful drain for in-flight requests

## Objective
Add SIGINT handler in server entry point that stops accepting new connections and waits for active requests to complete before exiting. Ensure no abrupt termination during active SSE streams.

## Files to Modify

### 1. `bin/agentic-service.js`

**Add graceful shutdown handler:**

```javascript
#!/usr/bin/env node

import { startService } from '../src/index.js';

let server = null;
let isShuttingDown = false;

async function main() {
  try {
    server = await startService();
    console.log('[SERVICE] Started successfully');
  } catch (error) {
    console.error('[SERVICE] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('[SHUTDOWN] Already shutting down, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('[SHUTDOWN] Server closed, no new connections accepted');
    });
  }

  // Wait for in-flight requests to complete
  const timeout = 30000; // 30 seconds
  const startTime = Date.now();

  const checkInterval = setInterval(() => {
    const activeConnections = server?.getActiveConnections?.() || 0;
    const elapsed = Date.now() - startTime;

    console.log(`[SHUTDOWN] Waiting for ${activeConnections} active connections... (${elapsed}ms)`);

    if (activeConnections === 0 || elapsed >= timeout) {
      clearInterval(checkInterval);
      
      if (activeConnections > 0) {
        console.warn(`[SHUTDOWN] Timeout reached, forcing exit with ${activeConnections} active connections`);
      } else {
        console.log('[SHUTDOWN] All connections closed gracefully');
      }

      process.exit(0);
    }
  }, 1000);
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

main();
```

### 2. `src/server/api.js`

**Track active connections and SSE streams:**

```javascript
import express from 'express';

class APIServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.activeConnections = new Set();
    this.activeStreams = new Set();
  }

  start(port = 3000) {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        console.log(`[API] Server listening on port ${port}`);
        resolve(this.server);
      });

      // Track connections
      this.server.on('connection', (socket) => {
        this.activeConnections.add(socket);
        
        socket.on('close', () => {
          this.activeConnections.delete(socket);
        });
      });

      this.server.on('error', reject);
    });
  }

  getActiveConnections() {
    return this.activeConnections.size;
  }

  getActiveStreams() {
    return this.activeStreams.size;
  }

  close() {
    return new Promise((resolve) => {
      // Stop accepting new connections
      this.server.close(() => {
        console.log('[API] Server closed');
        resolve();
      });

      // Close idle connections immediately
      for (const socket of this.activeConnections) {
        if (!socket.destroyed && socket.readyState === 'open') {
          // Only destroy if no active streams
          const hasActiveStream = Array.from(this.activeStreams).some(
            stream => stream.socket === socket
          );
          
          if (!hasActiveStream) {
            socket.destroy();
          }
        }
      }
    });
  }
}

// SSE endpoint with graceful shutdown support
app.get('/api/chat/stream', async (req, res) => {
  const streamId = Date.now();
  
  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Track this stream
  const stream = { id: streamId, socket: req.socket, res };
  this.activeStreams.add(stream);

  // Cleanup on close
  req.on('close', () => {
    console.log(`[SSE] Stream ${streamId} closed`);
    this.activeStreams.delete(stream);
  });

  try {
    // Stream LLM response
    for await (const chunk of llmStream) {
      if (res.writableEnded) break;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error(`[SSE] Stream ${streamId} error:`, error);
    res.end();
  } finally {
    this.activeStreams.delete(stream);
  }
});

export default APIServer;
```

### 3. `src/index.js`

**Export server instance for shutdown:**

```javascript
import APIServer from './server/api.js';

let apiServer = null;

export async function startService() {
  apiServer = new APIServer();
  
  const server = await apiServer.start(process.env.PORT || 3000);
  
  // Attach helper methods
  server.getActiveConnections = () => apiServer.getActiveConnections();
  server.getActiveStreams = () => apiServer.getActiveStreams();
  
  return server;
}

export function getServer() {
  return apiServer;
}
```

### 4. `test/server/shutdown.test.js`

**Create shutdown tests:**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startService } from '../../src/index.js';
import fetch from 'node-fetch';

describe('Graceful Shutdown', () => {
  let server;

  beforeEach(async () => {
    server = await startService();
  });

  afterEach(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('should complete in-flight request before shutdown', async () => {
    // Start a long-running request
    const requestPromise = fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' })
    });

    // Wait a bit, then trigger shutdown
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const shutdownPromise = new Promise(resolve => {
      server.close(resolve);
    });

    // Request should complete
    const response = await requestPromise;
    expect(response.ok).toBe(true);

    // Then shutdown completes
    await shutdownPromise;
  });

  it('should not accept new connections after shutdown starts', async () => {
    // Start shutdown
    server.close();

    // Try to make new request
    await expect(
      fetch('http://localhost:3000/api/status')
    ).rejects.toThrow();
  });

  it('should wait for SSE streams to complete', async () => {
    // Start SSE stream
    const response = await fetch('http://localhost:3000/api/chat/stream');
    const reader = response.body.getReader();

    // Trigger shutdown
    const shutdownPromise = new Promise(resolve => {
      server.close(resolve);
    });

    // Stream should complete gracefully
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
    }

    await shutdownPromise;
  });
});
```

## Algorithm

1. Register SIGINT/SIGTERM handlers
2. On signal received:
   - Set `isShuttingDown` flag
   - Call `server.close()` to stop accepting new connections
   - Track active connections and SSE streams
   - Poll every 1 second for active connections
   - Wait up to 30 seconds for completion
   - Force exit if timeout reached
3. Log progress throughout shutdown

## Edge Cases

- **Multiple SIGINT:** Second signal forces immediate exit
- **Long-running SSE:** Timeout after 30s, force close
- **No active connections:** Exit immediately
- **Server not started:** Exit gracefully without errors
- **Uncaught errors during shutdown:** Force exit

## Error Handling

- Catch all errors in shutdown handler
- Log all shutdown steps for debugging
- Provide timeout to prevent hanging
- Force exit if graceful shutdown fails

## Dependencies

- No additional npm packages needed

## Test Cases

1. **Unit test:** SIGINT handler registered
2. **Unit test:** Server stops accepting new connections
3. **Integration test:** In-flight request completes before exit
4. **Integration test:** SSE stream completes gracefully
5. **Integration test:** Timeout forces exit after 30s
6. **E2E test:** Full shutdown flow with active connections

## Verification

```bash
# Run tests
npm test -- test/server/shutdown.test.js

# Manual test
npm start &
PID=$!
sleep 2
curl http://localhost:3000/api/status &
sleep 1
kill -SIGINT $PID
# Should see graceful shutdown logs
```

## Logging Output

Expected logs during graceful shutdown:

```
[SHUTDOWN] Received SIGINT, starting graceful shutdown...
[SHUTDOWN] Server closed, no new connections accepted
[SHUTDOWN] Waiting for 2 active connections... (1000ms)
[SHUTDOWN] Waiting for 1 active connections... (2000ms)
[SSE] Stream 1234567890 closed
[SHUTDOWN] All connections closed gracefully
```
