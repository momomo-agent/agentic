#!/bin/sh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
VENDOR="$ROOT/vendor"
mkdir -p "$VENDOR"
for pkg in agentic-embed agentic-sense agentic-store agentic-voice; do
  PKG_DIR="$ROOT/../$pkg"
  [ -f "$PKG_DIR/package.json" ] || { echo "Missing $PKG_DIR"; exit 1; }
  (cd "$PKG_DIR" && npm pack --pack-destination "$VENDOR" --quiet)
  mv "$VENDOR/$pkg"-*.tgz "$VENDOR/$pkg.tgz"
done
docker build -f "$ROOT/install/Dockerfile" "$ROOT"
