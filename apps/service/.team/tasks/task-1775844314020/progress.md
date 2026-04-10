# Progress: Fix embed.js build failure

## Done
- Fixed src/runtime/embed.js: wrap text in array for localEmbed([text]), destructure first result
- Updated test/runtime/embed.test.js: mock now matches real localEmbed signature (sync, takes array, returns array of arrays)
- All 4 m98-embed-build-fix tests pass, all embed.test.js tests pass
- Full suite: 900 passed, 11 skipped, 1 unrelated failure (m28-profiles-cache)
- Committed: 9a0c73b8
