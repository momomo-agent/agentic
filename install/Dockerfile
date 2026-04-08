FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY vendor/ ./vendor/
COPY src/ui/admin/package*.json src/ui/admin/
RUN npm ci && npm run build && npm prune --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
