# Progress: Fix root Dockerfile EXPOSE 3000 → 1234

- Changed `Dockerfile` line 13: `EXPOSE 3000` → `EXPOSE 1234`
- Verified both `Dockerfile` and `install/Dockerfile` now show `EXPOSE 1234`
- Syntax check passed
- Committed: `da942ee7`
