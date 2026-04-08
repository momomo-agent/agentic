# Task Design: Fix Docker build — resolve agentic-* local package dependencies

## Files to Create/Modify

- `install/Dockerfile` — add `COPY vendor/ ./vendor/` before `npm ci`
- `install/docker-build.sh` — new helper: packs siblings, then runs docker build
- `package.json` — replace `"*"` deps with `file:./vendor/<pkg>.tgz`

## Implementation

### package.json
Replace in `dependencies`:
```json
"agentic-embed": "file:./vendor/agentic-embed.tgz",
"agentic-sense": "file:./vendor/agentic-sense.tgz",
"agentic-store": "file:./vendor/agentic-store.tgz",
"agentic-voice": "file:./vendor/agentic-voice.tgz"
```

### install/Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY vendor/ ./vendor/
COPY src/ui/admin/package*.json src/ui/admin/
RUN npm ci && npm run build && npm prune --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "bin/agentic-service.js"]
```

### install/docker-build.sh
```sh
#!/bin/sh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
VENDOR="$ROOT/vendor"
mkdir -p "$VENDOR"
for pkg in agentic-embed agentic-sense agentic-store agentic-voice; do
  PKG_DIR="$ROOT/../$pkg"
  [ -f "$PKG_DIR/package.json" ] || { echo "Missing $PKG_DIR"; exit 1; }
  (cd "$PKG_DIR" && npm pack --pack-destination "$VENDOR" --quiet)
  # rename to stable name
  mv "$VENDOR/$pkg"-*.tgz "$VENDOR/$pkg.tgz"
done
docker build -f "$ROOT/install/Dockerfile" "$ROOT"
```

## Edge Cases
- `.dockerignore` must not exclude `vendor/` — verify or add `!vendor/`
- Script must be run from repo root or `install/` dir — uses `$ROOT` to be path-agnostic
- If sibling package missing, script exits with clear error before docker build

## Test Cases
1. Run `sh install/docker-build.sh` — exits 0, image built
2. `docker run --rm -p 3000:3000 <image>` — `curl localhost:3000/api/status` returns 200
3. `npm ci` in a clean dir with `vendor/*.tgz` present — resolves all agentic-* deps
