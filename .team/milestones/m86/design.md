# M86 Technical Design — Docker agentic-* Package Resolution

## Problem

`package.json` lists `agentic-embed`, `agentic-sense`, `agentic-store`, `agentic-voice` as npm dependencies with `"*"` version. These packages are local siblings (not published to npm registry), so `npm ci` inside Docker fails with 404.

## Chosen Approach: npm pack + COPY

Use `npm pack` on each local package before `docker build`, copy the tarballs into the Docker context, and install from local tarballs. This avoids workspace complexity and works with standard `npm ci`.

## Changes Required

### 1. `install/Dockerfile`
- Add `COPY` instructions for each packed tarball before `npm ci`
- Install tarballs via `npm install --no-save` before `npm ci`, or update package.json references

### 2. `package.json`
- Replace `"agentic-*": "*"` entries with `"file:./vendor/agentic-*.tgz"` path references

### 3. `install/docker-build.sh` (new helper script)
- Runs `npm pack` for each sibling package
- Copies tarballs to `vendor/` directory
- Runs `docker build`

## Directory Layout After Fix

```
agentic-service/
├── vendor/
│   ├── agentic-embed-*.tgz
│   ├── agentic-sense-*.tgz
│   ├── agentic-store-*.tgz
│   └── agentic-voice-*.tgz
├── install/
│   ├── Dockerfile          (updated)
│   └── docker-build.sh     (new)
└── package.json            (updated file: refs)
```

## Dockerfile Changes

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

## package.json dependency changes

```json
"agentic-embed": "file:./vendor/agentic-embed.tgz",
"agentic-sense": "file:./vendor/agentic-sense.tgz",
"agentic-store": "file:./vendor/agentic-store.tgz",
"agentic-voice": "file:./vendor/agentic-voice.tgz"
```

## docker-build.sh logic

```bash
#!/bin/sh
VENDOR=vendor
mkdir -p $VENDOR
for pkg in agentic-embed agentic-sense agentic-store agentic-voice; do
  tarball=$(cd ../agentic-service/../$pkg && npm pack --pack-destination ../agentic-service/$VENDOR 2>/dev/null | tail -1)
  # rename to stable name (no version suffix)
  mv $VENDOR/$tarball $VENDOR/$pkg.tgz 2>/dev/null || true
done
docker build -f install/Dockerfile .
```

## Edge Cases

- If a sibling package has no `package.json`, `npm pack` fails — script should exit with error message
- `.dockerignore` must NOT exclude `vendor/` directory
- `npm prune --omit=dev` after build is safe since tarballs are in `vendor/` (not node_modules)
