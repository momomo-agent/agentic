# Design: 提升测试覆盖率至98%

## Files
- `vitest.config.js` (modify)
- `test/api.extra.test.js` (new)
- `test/profiles.edge.test.js` (new)
- `test/sigint.test.js` (new)

## vitest.config.js
```javascript
coverage: {
  thresholds: { lines: 98, functions: 98, branches: 98 }
}
```

## api.extra.test.js
```javascript
// POST /api/transcribe — invalid format → 400
it('transcribe invalid format', async () => {
  const res = await request(app).post('/api/transcribe').send({ audio: 'bad' })
  expect(res.status).toBe(400)
})

// PUT /api/config — disk write failure → 500
it('config write failure', async () => {
  vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('disk full'))
  const res = await request(app).put('/api/config').send({ llm: {} })
  expect(res.status).toBe(500)
})
```

## profiles.edge.test.js
```javascript
// getProfile with empty profiles array → returns default
it('empty profiles returns default', () => {
  const result = getProfile(hardware, [])
  expect(result).toEqual(defaultProfile)
})
```

## sigint.test.js
```javascript
it('SIGINT calls server.close', () => {
  const close = vi.fn()
  setupSigint({ close })
  process.emit('SIGINT')
  expect(close).toHaveBeenCalled()
})
```

## Edge cases
- fs mock must be restored after each test
- SIGINT test must not actually exit the process
