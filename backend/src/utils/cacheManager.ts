/**
 * In-Memory Fast Cache Manager
 * Provides sub-millisecond retrieval with TTL support and prefix-based cache invalidation.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheManager {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get an item from the cache. Returns null if expired or missing.
   */
  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store an item in the cache with a specified TTL in milliseconds (default: 5 minutes).
   */
  public set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  public invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate all stats, rankings, leaderboard, and career caches.
   * Call this whenever a match is uploaded, updated, or deleted.
   */
  public invalidateAllStats(): void {
    this.invalidatePrefix('stats_');
    this.invalidatePrefix('leaderboard_');
    this.invalidatePrefix('records_');
    this.invalidatePrefix('rankings_');
    this.invalidatePrefix('reigns_');
    this.invalidatePrefix('career_');
    this.invalidatePrefix('history_');
  }

  /**
   * Clear the entire cache.
   */
  public clear(): void {
    this.store.clear();
  }
}

export const cacheManager = new CacheManager();
