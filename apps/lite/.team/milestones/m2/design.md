# M2 Technical Design — Provider Robustness & Package Release

## Tasks

### task-1775526862838: Fix detectProvider apiKey validation
- File: `src/providers/provider.ts`
- In `createProvider()`, before the switch: if `provider !== 'custom'` and `!config.apiKey`, throw `Error('apiKey is required')`
- In `detectProvider()`, add same guard at top

### task-1775526867192: npm publish config + README
- File: `package.json` — add `"publishConfig": { "access": "public" }`
- File: `README.md` — add Installation section: `npm install agentic-lite`

### task-1775526873714: PRD.md
- File: `PRD.md` at project root
- Sections: Overview, Agent Loop, Tools (search/code/file), Provider Config, AgenticResult

### task-1775526877132: EXPECTED_DBB.md
- File: `EXPECTED_DBB.md` at project root
- Global acceptance criteria covering all shipped features

## Dependencies
All four tasks are independent and can run in parallel.
