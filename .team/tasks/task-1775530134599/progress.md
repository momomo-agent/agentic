# CDN profiles.json cache staleness check (7-day refresh)

## Progress

### Completed
- ✅ Verified existing implementation in `src/detector/profiles.js`
  - CACHE_MAX_AGE = 7 days is correctly set
  - isCacheExpired() logic is correct
  - saveCache() stores timestamp
  - loadCache() returns {data, timestamp}
  - Fallback chain works: fresh cache → remote fetch → expired cache → builtin

- ✅ Added 3 comprehensive test cases to `test/detector/profiles.test.js`:
  1. Re-fetches when cache is older than 7 days
  2. Uses cache without fetch when cache is fresh
  3. Falls back to expired cache if re-fetch fails

### Test Results
All 3 new staleness tests PASSED:
- ✅ re-fetches when cache is older than 7 days
- ✅ uses cache without fetch when cache is fresh
- ✅ falls back to expired cache if re-fetch fails

### Note
Two pre-existing tests failed due to outdated expectations (expected model names don't match current profiles). These failures are unrelated to the staleness check implementation.

### Conclusion
The 7-day staleness check is correctly implemented and fully tested. Task complete.
