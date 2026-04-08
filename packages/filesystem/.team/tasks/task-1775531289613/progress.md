# README 加使用示例

## Progress

### Completed
- Added new `## Backends` section after the intro
- Included configuration examples for all 3 backends:
  - AgenticStoreBackend (IndexedDB via agentic-store)
  - OPFSBackend (browser OPFS)
  - NodeFsBackend (Node.js / Electron)
- Added `### Performance` subsection with comparison table
- Table includes environment, read/write metrics, and notes for each backend
- Values are approximate for 1KB files as specified in design

### Implementation Details
- Placed section after "Key insight" line and before "## Features"
- Used TypeScript code blocks for examples
- Performance table has 3 rows (one per backend) with measurable metrics
- Follows design spec exactly

### Test Coverage
- README now contains code blocks for all 3 backends (DBB-014)
- README contains performance table with ≥3 rows and measurable metrics (DBB-015)
