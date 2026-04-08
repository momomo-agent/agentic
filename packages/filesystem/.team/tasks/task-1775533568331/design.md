# Design: Edge case tests

## File to Create

- `tests/edge-cases.test.js`

## Test Cases

Use same `backends()` helper from cross-backend tests (or duplicate inline).

For each backend:

1. **Empty path segments**: `set('//double-slash', 'x')` → `get('//double-slash')` returns `'x'` (no crash)
2. **Special characters in filename**: `set('/file with spaces', 'v')` → `get('/file with spaces')` === `'v'`
3. **Unicode filename**: `set('/日本語.txt', 'u')` → `get('/日本語.txt')` === `'u'`
4. **Newline in content**: `set('/nl', 'line1\nline2')` → `get('/nl')` === `'line1\nline2'`
5. **Overwrite**: `set('/ow', 'a')`, `set('/ow', 'b')` → `get('/ow')` === `'b'`
6. **Concurrent writes**: `Promise.all([set('/cw', '1'), set('/cw', '2')])` resolves without error; `get('/cw')` is `'1'` or `'2'` (either is valid)
7. **Concurrent independent writes**: `Promise.all([set('/p1', 'a'), set('/p2', 'b')])` → both readable
8. **scan multiline**: `set('/m', 'foo\nbar\nbaz')`, `scan('bar')` → `[{ path: '/m', line: 2, content: 'bar' }]`
9. **list after delete**: `set('/del', 'x')`, `delete('/del')`, `list()` does not include `'/del'`

## Notes

- OPFS is browser-only; skip in Node test runner
- Concurrent write test only asserts no error + one valid value (race outcome is non-deterministic)
- NodeFsBackend special-char tests depend on OS filesystem support; mark as known-skip on Windows if needed

## Dependencies

- Same as cross-backend tests: `node:test`, `node:assert`, `NodeFsBackend`, `AgenticStoreBackend`
