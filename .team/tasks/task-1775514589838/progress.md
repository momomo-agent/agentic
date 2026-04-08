# Admin UI + Docker + setup.sh端到端验收

## Progress

- Added `build` script to package.json: `cd src/ui/admin && npm install && npm run build`
- Fixed Dockerfile: copy admin package.json first, run build before prune, then COPY . .
- api.js and setup.sh required no changes
