import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client-Side Dual-Tier Cache (L1 RAM + L2 AsyncStorage Disk Persistence)
 * Provides instant 0ms rendering from mobile storage across app restarts,
 * while allowing background revalidation (SWR) to update data seamlessly.
 */

const CACHE_KEY_PREFIX = '@cricpro_cache:';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  timestamp: number;
}

class ClientCacheManager {
  private memoryStore: Map<string, CacheEntry<any>> = new Map();

  /**
   * Synchronous L1 RAM cache lookup.
   */
  public get<T>(key: string, ignoreExpiry: boolean = false): T | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (!ignoreExpiry && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Asynchronous L2 Persistent Storage lookup (AsyncStorage).
   * Falls back to disk if not yet populated in RAM.
   */
  public async getAsync<T>(key: string, ignoreExpiry: boolean = false): Promise<T | null> {
    // 1. Check RAM first
    const mem = this.get<T>(key, ignoreExpiry);
    if (mem !== null) return mem;

    // 2. Check AsyncStorage on phone disk
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (!entry) return null;

      // Populate RAM
      this.memoryStore.set(key, entry);

      if (!ignoreExpiry && Date.now() > entry.expiresAt) {
        AsyncStorage.removeItem(CACHE_KEY_PREFIX + key).catch(() => {});
        this.memoryStore.delete(key);
        return null;
      }

      return entry.value;
    } catch (e) {
      console.warn('Cache getAsync error for key:', key, e);
      return null;
    }
  }

  /**
   * Store data in both L1 RAM and L2 AsyncStorage (phone disk storage).
   */
  public set<T>(key: string, value: T, ttlMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
      timestamp: Date.now(),
    };

    // 1. Instant RAM store
    this.memoryStore.set(key, entry);

    // 2. Persistent AsyncStorage write (non-blocking)
    AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry)).catch(err => {
      console.warn('AsyncStorage set error:', err);
    });
  }

  /**
   * Check if entry exists in RAM
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate prefix in both RAM and AsyncStorage
   */
  public async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
      }
    }

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchKeys = allKeys.filter(k => k.startsWith(CACHE_KEY_PREFIX + prefix));
      if (matchKeys.length > 0) {
        await AsyncStorage.multiRemove(matchKeys);
      }
    } catch (e) {
      console.warn('AsyncStorage invalidatePrefix error:', e);
    }
  }

  /**
   * Clear all cached data
   */
  public async clear(): Promise<void> {
    this.memoryStore.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchKeys = allKeys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
      if (matchKeys.length > 0) {
        await AsyncStorage.multiRemove(matchKeys);
      }
    } catch (e) {
      console.warn('AsyncStorage clear error:', e);
    }
  }
}

export const clientCache = new ClientCacheManager();
