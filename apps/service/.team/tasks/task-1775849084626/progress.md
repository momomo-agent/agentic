# Fix m21-profiles.test.js — loadBuiltinProfiles fails under fs mock

## Progress

- Ran `test/m21-profiles.test.js` — both DBB-001 and DBB-002 pass
- Full suite: 905/916 pass (0 failures, 11 skipped)
- The tests work correctly as-is: the `readFile` mock properly passes through `file://` URL objects to `actual.readFile`, so `loadBuiltinProfiles()` loads `profiles/default.json` successfully
- No code changes needed — issue appears to have been resolved by a prior fix
