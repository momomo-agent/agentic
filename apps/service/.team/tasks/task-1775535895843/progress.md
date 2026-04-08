# Fix WebSocket disconnect — remove device from registry

## Progress

Fixed two bugs in hub.js:
1. `registerDevice` with object now upserts `devices` map (was skipping update if id existed)
2. `unregisterDevice` now also deletes from `devices` (was only deleting from `registry`)

5/5 tests pass.
