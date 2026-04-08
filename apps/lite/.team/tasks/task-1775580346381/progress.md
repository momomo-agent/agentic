# Fix openai.ts apiKey validation for custom+baseUrl provider

## Progress

Fixed `src/providers/openai.ts:7` — apiKey now only required when baseUrl is also absent.
Removed `Authorization` header when apiKey is undefined.
Removed `.fails()` marker from DBB-005 test.
All 97 tests pass.
