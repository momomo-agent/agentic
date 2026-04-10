FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY vendor ./vendor
RUN npm ci --omit=dev

COPY bin ./bin
COPY src ./src
COPY profiles ./profiles

EXPOSE 1234

CMD ["node", "bin/agentic-service.js", "--skip-setup"]
