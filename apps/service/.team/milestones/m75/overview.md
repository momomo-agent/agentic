# M75: CDN Staleness + README + LAN Tunnel

## Goals
Close remaining partial gaps after m71/m72/m74: CDN cache staleness enforcement, README completeness verification, and LAN tunnel (ngrok/cloudflare) for remote access.

## Scope
1. CDN profiles.json 7-day staleness check — re-fetch if cached copy is older than 7 days
2. README completeness — verify npx/Docker/API docs are accurate and complete
3. LAN tunnel — implement ngrok or cloudflare tunnel for remote device access

## Acceptance Criteria
- [ ] profiles.js re-fetches CDN when cache age > 7 days
- [ ] README covers: npx install, Docker deploy, API endpoints, admin panel URL
- [ ] `npm run tunnel` starts a LAN tunnel and prints the public URL

## Out of Scope
- Multi-device brain state deep sharing — deferred
- agentic-store/agentic-embed as true external packages — deferred (architecture CR needed)
