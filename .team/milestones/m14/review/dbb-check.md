# M14 DBB Check

**Match: 82%** | 2026-04-06T21:06:17Z

## Pass
- setup.js: installOllama() spawns sh -c cmd — executes install
- setup.js: setupOllama() checks if already installed, skips if present
- hub.js sendCommand(): SUPPORTED=['capture','speak','display'], throws on unknown type
- llm.js: loadConfig() calls getProfile(hardware) from optimizer/profiles
- Different hardware → different model (profiles/default.json: arm64=gemma4:26b, nvidia=gemma4:13b)

## Partial
- User declines install prompt: setup.js doesn't show interactive y/n prompt — auto-installs
- README.md: not found at project root
