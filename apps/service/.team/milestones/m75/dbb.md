# M75 DBB — CDN Staleness + LAN Tunnel

## Verification Criteria

### task-1775530134599: CDN profiles.json cache staleness (7-day refresh)
- [ ] `loadProfiles()` re-fetches from CDN when cached file is older than 7 days
- [ ] Fresh cache (< 7 days) is used without network call
- [ ] If re-fetch fails, expired cache is used as fallback (no crash)
- [ ] Cache timestamp is updated after successful re-fetch
- [ ] Unit test: mock `fs.stat` mtime to simulate expired cache → fetch is called
- [ ] Unit test: mock mtime < 7 days → fetch is NOT called

### task-1775530233859: LAN tunnel via ngrok/cloudflare
- [ ] `npm run tunnel` starts a tunnel and prints the public URL
- [ ] Tries ngrok first; falls back to cloudflare tunnel if ngrok unavailable
- [ ] Prints clear error if neither tool is installed
- [ ] URL is printed to stdout in format: `Tunnel URL: https://...`
- [ ] Process exits cleanly on SIGINT (Ctrl+C)
