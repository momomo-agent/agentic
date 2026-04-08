# Design: Docker 打包

## Files
- `install/Dockerfile`
- `install/docker-compose.yml`

## Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

## docker-compose.yml
```yaml
services:
  agentic-service:
    build: ..
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
```

## Test Cases
- `docker build` exits 0
- `docker run -p 3000:3000` → `curl localhost:3000` returns 200
- `docker-compose up` → service accessible on port 3000
