# Fix Docker build — resolve agentic-* local package dependencies

## Progress

- `package.json`: replaced `"*"` with `file:./vendor/<pkg>.tgz` for all 4 agentic-* packages
- `install/Dockerfile`: added `COPY vendor/ ./vendor/` before `npm ci`
- `install/docker-build.sh`: created — packs sibling packages into vendor/, then runs docker build
- `.dockerignore`: no change needed (vendor/ not excluded)
