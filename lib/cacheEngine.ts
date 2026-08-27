// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface CacheOptions {
  ttlSeconds?: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number | null;
  timerId?: NodeJS.Timeout | ReturnType<typeof setTimeout>;
}

export type ExpirationListener<T> = (key: string, value: T) => void;

// ---------------------------------------------------------------------------
// CacheEngine
// ---------------------------------------------------------------------------

export class CacheEngine<T> {
  private store = new Map<string, CacheEntry<T>>();
  private expirationListeners: ExpirationListener<T>[] = [];
  private inFlightFetches = new Map<string, Promise<T>>();

  /**
   * Sets a key-value entry in the cache with optional TTL.
   */
  public set(key: string, value: T, options?: CacheOptions): void {
    // Clear existing timer if updating existing key
    this.clearKeyTimer(key);

    const now = Date.now();
    const ttlSeconds = options?.ttlSeconds;
    const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null;

    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt,
    };

    if (ttlSeconds && ttlSeconds > 0) {
      entry.timerId = setTimeout(() => {
        this.handleExpiry(key);
      }, ttlSeconds * 1000);
    }

    this.store.set(key, entry);
  }

  /**
   * Gets a value from cache. If expired, purges and returns null.
   */
  public get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      this.handleExpiry(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Returns remaining TTL in seconds (-1 for no TTL, -2 if missing/expired).
   */
  public getTtl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;

    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.handleExpiry(key);
      return -2;
    }

    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Checks if key exists and is non-expired.
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Deletes a key from the cache.
   */
  public delete(key: string): boolean {
    this.clearKeyTimer(key);
    return this.store.delete(key);
  }

  /**
   * Atomically gets or computes a value to avoid cache stampedes.
   */
  public async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const existing = this.get(key);
    if (existing !== null) {
      return existing;
    }

    // Check if another request is already fetching this key
    const inFlight = this.inFlightFetches.get(key);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      try {
        const val = await fetcher();
        this.set(key, val, options);
        return val;
      } finally {
        this.inFlightFetches.delete(key);
      }
    })();

    this.inFlightFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Registers a listener callback triggered on key expiration.
   */
  public onExpire(listener: ExpirationListener<T>): () => void {
    this.expirationListeners.push(listener);
    return () => {
      this.expirationListeners = this.expirationListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Returns the count of active entries.
   */
  public size(): number {
    // Purge expired first
    const now = Date.now();
    for (const [k, entry] of this.store.entries()) {
      if (entry.expiresAt && now >= entry.expiresAt) {
        this.handleExpiry(k);
      }
    }
    return this.store.size;
  }

  /**
   * Clears all cache entries and associated timers.
   */
  public clear(): void {
    for (const key of this.store.keys()) {
      this.clearKeyTimer(key);
    }
    this.store.clear();
    this.inFlightFetches.clear();
  }

  /**
   * Destroys the cache instance and unregisters all timers.
   */
  public destroy(): void {
    this.clear();
    this.expirationListeners = [];
  }

  private clearKeyTimer(key: string): void {
    const existing = this.store.get(key);
    if (existing?.timerId) {
      clearTimeout(existing.timerId);
    }
  }

  private handleExpiry(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;

    this.clearKeyTimer(key);
    this.store.delete(key);

    for (const listener of this.expirationListeners) {
      try {
        listener(key, entry.value);
      } catch (err) {
        console.error(`[CacheEngine] Expiration listener error for key ${key}:`, err);
      }
    }
  }
}

export const appCache = new CacheEngine<unknown>();
