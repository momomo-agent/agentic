# Design: 完善 src/ui/client/ Admin路由

## Approach
The admin SPA lives at `src/ui/admin/` (separate Vite app, served by server at `/admin`).
The client app (`src/ui/client/`) needs a link/nav to `/admin`.
No vue-router needed — `/admin` is a separate origin served by Express.

## Changes

### src/ui/client/src/App.vue
Add a nav link to `/admin` in the template:
```html
<a href="/admin" class="admin-link">Admin</a>
```

### src/server/api.js (if not already done in M20)
Ensure Express serves admin SPA static files at `/admin`:
```js
app.use('/admin', express.static(path.join(__dirname, '../ui/admin/dist')));
```

## Files to Modify
- `src/ui/client/src/App.vue` — add `<a href="/admin">` nav link

## Files to Verify (no change needed if M20 complete)
- `src/server/api.js` — confirm `/admin` static mount exists

## Test Cases
- `GET /admin` returns 200 with HTML (DBB-004)
- Client UI shows link to `/admin`
- Clicking link navigates to admin panel without 404

## Edge Cases
- Admin dist not built → serve 404 with helpful message
- `/admin` path conflict with API routes → mount static before catch-all
