# M43 DBB — VAD + README + CDN Endpoint + Headless Sense

## DBB-001: VAD auto-detects speech
- Given: user speaks into mic (no button press)
- Then: recording starts automatically, stops after 1.5s silence
- Verify: `useVAD` `onStart`/`onStop` callbacks fire without push-to-talk

## DBB-002: README covers install/config/usage
- Given: fresh clone
- Then: README.md exists at repo root with npx install, config options, and usage sections
- Verify: `cat README.md` shows all three sections

## DBB-003: CDN URL is real
- Given: `src/detector/profiles.js`
- Then: `PROFILES_URL` default is not `cdn.example.com`
- Verify: `grep PROFILES_URL src/detector/profiles.js` shows a real GitHub raw or CDN URL

## DBB-004: sense.js headless camera path works
- Given: server-side Node.js context (no browser)
- Then: `initHeadless()` + `detectFrame(buffer)` returns `{faces, gestures, objects}` without error
- Verify: unit test calls `detectFrame(null)` returns empty arrays; `detectFrame(buffer)` returns detection result
