# Task: Implement CDN profiles.json 7-day cache staleness refresh

## Objective
Implement cache staleness logic in `profiles.js` that refreshes cached `profiles.json` from CDN if older than 7 days, while still supporting offline fallback.

## Files to Modify

### 1. `src/detector/profiles.js`

**Add cache staleness checking:**

```javascript
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import fetch from 'node-fetch';

const CACHE_DIR = join(homedir(), '.agentic-service', 'cache');
const CACHE_FILE = join(CACHE_DIR, 'profiles.json');
const CDN_URL = 'https://cdn.agentic-service.dev/profiles.json';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class ProfileManager {
  constructor() {
    this.profiles = null;
  }

  async getProfiles() {
    if (this.profiles) {
      return this.profiles;
    }

    // Check if cache exists and is fresh
    if (this.isCacheFresh()) {
      console.log('[PROFILES] Using cached profiles');
      this.profiles = this.loadFromCache();
      return this.profiles;
    }

    // Try to fetch from CDN
    try {
      console.log('[PROFILES] Fetching from CDN...');
      this.profiles = await this.fetchFromCDN();
      this.saveToCache(this.profiles);
      return this.profiles;
    } catch (error) {
      console.warn('[PROFILES] CDN fetch failed:', error.message);
      
      // Fallback to stale cache if available
      if (this.hasCachedProfiles()) {
        console.log('[PROFILES] Using stale cache as fallback');
        this.profiles = this.loadFromCache();
        return this.profiles;
      }

      // Ultimate fallback to bundled default
      console.log('[PROFILES] Using bundled default profiles');
      this.profiles = this.loadDefaultProfiles();
      return this.profiles;
    }
  }

  isCacheFresh() {
    if (!existsSync(CACHE_FILE)) {
      return false;
    }

    try {
      const stats = statSync(CACHE_FILE);
      const age = Date.now() - stats.mtimeMs;
      return age < CACHE_MAX_AGE_MS;
    } catch (error) {
      console.error('[PROFILES] Cache check failed:', error);
      return false;
    }
  }

  hasCachedProfiles() {
    return existsSync(CACHE_FILE);
  }

  loadFromCache() {
    try {
      const data = readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[PROFILES] Cache load failed:', error);
      throw error;
    }
  }

  async fetchFromCDN() {
    const response = await fetch(CDN_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'agentic-service/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`CDN returned ${response.status}`);
    }

    const data = await response.json();
    
    // Validate structure
    if (!data.profiles || !Array.isArray(data.profiles)) {
      throw new Error('Invalid profiles structure');
    }

    return data;
  }

  saveToCache(profiles) {
    try {
      // Ensure cache directory exists
      if (!existsSync(CACHE_DIR)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(CACHE_DIR, { recursive: true });
      }

      writeFileSync(CACHE_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
      console.log('[PROFILES] Saved to cache');
    } catch (error) {
      console.error('[PROFILES] Cache save failed:', error);
      // Non-fatal, continue without caching
    }
  }

  loadDefaultProfiles() {
    // Load bundled profiles/default.json
    const defaultPath = join(process.cwd(), 'profiles', 'default.json');
    const data = readFileSync(defaultPath, 'utf-8');
    return JSON.parse(data);
  }

  getCacheAge() {
    if (!existsSync(CACHE_FILE)) {
      return null;
    }

    const stats = statSync(CACHE_FILE);
    return Date.now() - stats.mtimeMs;
  }

  async forceRefresh() {
    console.log('[PROFILES] Forcing refresh from CDN...');
    this.profiles = null;
    return await this.getProfiles();
  }
}

// Singleton instance
const profileManager = new ProfileManager();

export async function getProfile(hardware) {
  const profiles = await profileManager.getProfiles();
  return matchProfile(hardware, profiles.profiles);
}

export function matchProfile(hardware, profiles) {
  // Matching logic from previous design
  for (const profile of profiles) {
    if (isMatch(hardware, profile.match)) {
      return profile;
    }
  }

  // Fallback to cpu-only
  const cpuOnlyProfile = profiles.find(p => p.id === 'cpu-only');
  if (cpuOnlyProfile) {
    return cpuOnlyProfile;
  }

  throw new Error('No matching profile found');
}

function isMatch(hardware, match) {
  // Matching logic from previous design
  if (match.platform && hardware.platform !== match.platform) return false;
  if (match.arch && hardware.arch !== match.arch) return false;
  if (match.gpu && hardware.gpu.type !== match.gpu) return false;
  
  if (match.memory) {
    if (match.memory.min && hardware.memory < match.memory.min) return false;
    if (match.memory.max && hardware.memory > match.memory.max) return false;
  }
  
  if (match.vram) {
    if (match.vram.min && hardware.gpu.vram < match.vram.min) return false;
    if (match.vram.max && hardware.gpu.vram > match.vram.max) return false;
  }
  
  return true;
}

export { profileManager };
```

### 2. `test/detector/profiles.test.js`

**Add cache staleness tests:**

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { profileManager } from '../../src/detector/profiles.js';
import { existsSync, unlinkSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_FILE = join(homedir(), '.agentic-service', 'cache', 'profiles.json');

describe('Profile Cache Staleness', () => {
  beforeEach(() => {
    // Clear cache before each test
    if (existsSync(CACHE_FILE)) {
      unlinkSync(CACHE_FILE);
    }
    profileManager.profiles = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch from CDN when no cache exists', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ profiles: [] })
    });

    await profileManager.getProfiles();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('cdn.agentic-service.dev'),
      expect.any(Object)
    );
  });

  it('should use cache when fresh (< 7 days)', async () => {
    // Create fresh cache
    const mockProfiles = { profiles: [{ id: 'test' }] };
    writeFileSync(CACHE_FILE, JSON.stringify(mockProfiles));

    const fetchSpy = vi.spyOn(global, 'fetch');

    const profiles = await profileManager.getProfiles();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(profiles.profiles[0].id).toBe('test');
  });

  it('should refresh when cache is stale (> 7 days)', async () => {
    // Create stale cache
    const mockProfiles = { profiles: [{ id: 'old' }] };
    writeFileSync(CACHE_FILE, JSON.stringify(mockProfiles));

    // Set mtime to 8 days ago
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    utimesSync(CACHE_FILE, new Date(eightDaysAgo), new Date(eightDaysAgo));

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ profiles: [{ id: 'new' }] })
    });

    const profiles = await profileManager.getProfiles();

    expect(fetchSpy).toHaveBeenCalled();
    expect(profiles.profiles[0].id).toBe('new');
  });

  it('should use stale cache when CDN fails', async () => {
    // Create stale cache
    const mockProfiles = { profiles: [{ id: 'stale' }] };
    writeFileSync(CACHE_FILE, JSON.stringify(mockProfiles));

    // Set mtime to 8 days ago
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    utimesSync(CACHE_FILE, new Date(eightDaysAgo), new Date(eightDaysAgo));

    // Mock CDN failure
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const profiles = await profileManager.getProfiles();

    expect(profiles.profiles[0].id).toBe('stale');
  });

  it('should use bundled default when no cache and CDN fails', async () => {
    // Mock CDN failure
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const profiles = await profileManager.getProfiles();

    expect(profiles).toBeDefined();
    expect(profiles.profiles).toBeDefined();
  });

  it('should report cache age correctly', () => {
    // No cache
    expect(profileManager.getCacheAge()).toBeNull();

    // Create cache
    writeFileSync(CACHE_FILE, JSON.stringify({ profiles: [] }));
    const age = profileManager.getCacheAge();
    
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(1000); // Less than 1 second old
  });

  it('should force refresh on demand', async () => {
    // Create fresh cache
    writeFileSync(CACHE_FILE, JSON.stringify({ profiles: [{ id: 'old' }] }));

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ profiles: [{ id: 'new' }] })
    });

    const profiles = await profileManager.forceRefresh();

    expect(fetchSpy).toHaveBeenCalled();
    expect(profiles.profiles[0].id).toBe('new');
  });
});
```

## Algorithm

1. Check if cache file exists
2. If exists, check mtime (modification time)
3. Calculate age: `now - mtime`
4. If age < 7 days: use cache
5. If age >= 7 days: fetch from CDN
6. If CDN fetch fails: use stale cache as fallback
7. If no cache: use bundled default profiles
8. Save successful CDN fetch to cache

## Edge Cases

- **No internet:** Use stale cache or bundled default
- **CDN down:** Use stale cache or bundled default
- **Corrupted cache:** Delete and fetch fresh
- **Cache directory doesn't exist:** Create it
- **Permission errors:** Log warning, continue without cache
- **Invalid JSON from CDN:** Use stale cache or bundled default

## Error Handling

- Catch all network errors gracefully
- Log warnings for cache issues
- Never throw errors that prevent service startup
- Always have a fallback (stale cache → bundled default)

## Dependencies

- `node-fetch` for HTTP requests
- Node.js `fs` module for file operations

## Test Cases

1. **Unit test:** Fresh cache used without CDN fetch
2. **Unit test:** Stale cache triggers CDN fetch
3. **Unit test:** CDN failure uses stale cache
4. **Unit test:** No cache and CDN failure uses bundled default
5. **Unit test:** Cache age calculated correctly
6. **Unit test:** Force refresh bypasses cache
7. **Integration test:** Full cache lifecycle

## Verification Commands

```bash
# Run tests
npm test -- test/detector/profiles.test.js

# Manual test - fresh cache
node -e "import('./src/detector/profiles.js').then(async m => {
  const profiles = await m.profileManager.getProfiles();
  console.log('Cache age:', m.profileManager.getCacheAge(), 'ms');
})"

# Manual test - force refresh
node -e "import('./src/detector/profiles.js').then(async m => {
  await m.profileManager.forceRefresh();
  console.log('Refreshed');
})"

# Check cache file
ls -lh ~/.agentic-service/cache/profiles.json
cat ~/.agentic-service/cache/profiles.json | jq .
```

## Notes

- 7 days is configurable via `CACHE_MAX_AGE_MS` constant
- Cache stored in `~/.agentic-service/cache/profiles.json`
- CDN URL is `https://cdn.agentic-service.dev/profiles.json`
- Bundled default in `profiles/default.json` is ultimate fallback
- Cache is per-user, not system-wide
