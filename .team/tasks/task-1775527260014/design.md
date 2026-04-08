# Design: README Completeness Audit

## Required Sections
1. Install — npx, global, Docker
2. Usage — first-run flow, browser URL
3. API Reference — POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET|PUT /api/config
4. Docker — docker-compose up
5. Environment Variables — scan src/ for process.env reads

## Task
- Read README.md, add any missing sections
- Each API entry: method, path, request shape, response shape
