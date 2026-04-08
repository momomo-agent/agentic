# Design: Add missing test coverage

## File to modify
- `src/index.test.ts`

## Tests to add

### ls pagination (DBB-ls-003/004/005)
```typescript
it('ls --page 1 --page-size 2 returns first 2 entries', async () => {
  // setup fs with entries a, b, c, d
  expect((await shell.exec('ls --page 1 --page-size 2')).output).toBe('a\nb')
})
it('ls --page 2 --page-size 2 returns next 2 entries', async () => {
  expect((await shell.exec('ls --page 2 --page-size 2')).output).toBe('c\nd')
})
it('ls --page beyond range returns empty', async () => {
  expect((await shell.exec('ls --page 99 --page-size 2')).output).toBe('')
})
```

### find -type f/d (DBB-find-003/004)
```typescript
it('find -type f returns only files', async () => {
  // setup: /dir/file.txt (file), /dir/sub (dir)
  expect((await shell.exec('find /dir -type f')).output).toBe('/dir/file.txt')
})
it('find -type d returns only directories', async () => {
  expect((await shell.exec('find /dir -type d')).output).toBe('/dir/sub')
})
```

### rm -r refusing root (DBB-rm-005)
```typescript
it('rm -r / refuses to remove root', async () => {
  const r = await shell.exec('rm -r /')
  expect(r.output).toContain("refusing to remove '/'")
  expect(r.exitCode).toBe(1)
})
```

### cd to file returns Not a directory (DBB-cd-003)
```typescript
it('cd to a file returns Not a directory', async () => {
  await shell.exec('touch /myfile')
  const r = await shell.exec('cd /myfile')
  expect(r.output).toBe('cd: /myfile: Not a directory')
  expect(r.exitCode).toBe(1)
})
```

## Dependencies
- No source changes needed — only new tests in `src/index.test.ts`
- Existing MockFileSystem supports mkdir for directory setup
