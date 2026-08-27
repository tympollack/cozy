/**
 * In-memory Storage Boundary Mocks.
 * Provides pure in-memory implementations for S3/R2 object storage and Redis key-value cache.
 */

export interface StorageObject {
  bucket: string;
  key: string;
  body: Uint8Array | Buffer | string;
  contentType: string;
  size: number;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export class MemoryR2Storage {
  private objects = new Map<string, StorageObject>();

  private getCompositeKey(bucket: string, key: string): string {
    return `${bucket}::${key}`;
  }

  public async putObject(
    bucket: string,
    key: string,
    body: Uint8Array | Buffer | string,
    contentType = 'application/octet-stream',
    metadata?: Record<string, string>
  ): Promise<{ key: string; size: number; etag: string }> {
    const size = typeof body === 'string' ? Buffer.byteLength(body) : body.length;
    const item: StorageObject = {
      bucket,
      key,
      body,
      contentType,
      size,
      lastModified: new Date(),
      metadata,
    };
    this.objects.set(this.getCompositeKey(bucket, key), item);
    return {
      key,
      size,
      etag: `"mock-etag-${Date.now()}"`,
    };
  }

  public async getObject(bucket: string, key: string): Promise<StorageObject | null> {
    return this.objects.get(this.getCompositeKey(bucket, key)) ?? null;
  }

  public async deleteObject(bucket: string, key: string): Promise<boolean> {
    return this.objects.delete(this.getCompositeKey(bucket, key));
  }

  public async hasObject(bucket: string, key: string): Promise<boolean> {
    return this.objects.has(this.getCompositeKey(bucket, key));
  }

  public clear(): void {
    this.objects.clear();
  }

  public listObjects(bucket: string, prefix = ''): StorageObject[] {
    const list: StorageObject[] = [];
    for (const item of this.objects.values()) {
      if (item.bucket === bucket && item.key.startsWith(prefix)) {
        list.push(item);
      }
    }
    return list;
  }
}

export interface RedisEntry {
  value: string;
  expiresAt: number | null;
}

export class MemoryRedisCache {
  private store = new Map<string, RedisEntry>();

  public async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  public async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  public async exists(key: string): Promise<number> {
    const val = await this.get(key);
    return val !== null ? 1 : 0;
  }

  public async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  public async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, entry);
    return 1;
  }

  public async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  public clear(): void {
    this.store.clear();
  }
}

export const memoryR2Storage = new MemoryR2Storage();
export const memoryRedisCache = new MemoryRedisCache();
