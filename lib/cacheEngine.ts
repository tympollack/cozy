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
   * Gets a value from the cache. Returns null if expired or missing.
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
   * Gets remaining TTL in seconds. Returns -1 if no TTL, -2 if missing/expired.
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

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    this.clearKeyTimer(key);
    return this.store.delete(key);
  }

  /**
   * Stampede-proof atomic fetch-or-set.
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

  public onExpire(listener: ExpirationListener<T>): () => void {
    this.expirationListeners.push(listener);
    return () => {
      this.expirationListeners = this.expirationListeners.filter((l) => l !== listener);
    };
  }

  public size(): number {
    const now = Date.now();
    for (const [k, entry] of this.store.entries()) {
      if (entry.expiresAt && now >= entry.expiresAt) {
        this.handleExpiry(k);
      }
    }
    return this.store.size;
  }

  public clear(): void {
    for (const key of this.store.keys()) {
      this.clearKeyTimer(key);
    }
    this.store.clear();
    this.inFlightFetches.clear();
  }

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
