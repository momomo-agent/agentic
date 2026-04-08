# Admin Route Completion — Technical Design

## Files to Modify
- `src/ui/client/src/App.vue` — add `/admin` route link
- `src/ui/client/src/router/index.js` (or equivalent) — register admin route

## Changes

### router/index.js
```js
import { createRouter, createWebHistory } from 'vue-router'
import Chat from '../views/Chat.vue'
const AdminPanel = () => import('../views/AdminPanel.vue')  // lazy load

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Chat },
    { path: '/admin', component: AdminPanel }
  ]
})
```

### AdminPanel.vue (src/ui/client/src/views/)
- Thin wrapper that iframes or redirects to `src/ui/admin/` build output
- OR: renders admin components directly if admin is bundled into client

### App.vue
- Add nav link: `<router-link to="/admin">Admin</router-link>`

## Edge Cases
- Admin route should not break existing `/` chat route
- If admin is a separate Vite app, serve it from `server/api.js` at `/admin` path

## Test Cases
- Navigating to `/admin` renders admin panel without 404
- Back navigation to `/` restores chat UI
