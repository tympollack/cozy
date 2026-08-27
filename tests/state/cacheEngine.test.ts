import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheEngine } from '@/lib/cacheEngine';
import { InventoryLockManager, MutexLockError } from '@/lib/inventoryLock';

describe('State Machines & Cache Engines (Scope B)', () => {
  describe('CacheEngine with TTL & Expiration Handlers', () => {
    let cache: CacheEngine<string>;

    beforeEach(() => {
      vi.useFakeTimers();
      cache = new CacheEngine<string>();
    });

    afterEach(() => {
      cache.destroy();
      vi.useRealTimers();
    });

    it('stores and retrieves values with optimistic state retrieval', () => {
      cache.set('key-1', 'cozy-value', { ttlSeconds: 10 });
      expect(cache.get('key-1')).toBe('cozy-value');
      expect(cache.has('key-1')).toBe(true);
    });

    it('returns remaining TTL in seconds accurately', () => {
      cache.set('key-ttl', 'sample-data', { ttlSeconds: 30 });
      expect(cache.getTtl('key-ttl')).toBe(30);

      vi.advanceTimersByTime(10000);
      expect(cache.getTtl('key-ttl')).toBe(20);

      cache.set('no-ttl', 'persistent');
      expect(cache.getTtl('no-ttl')).toBe(-1);

      expect(cache.getTtl('missing-key')).toBe(-2);
    });

    it('expires keys automatically after TTL countdown and fires expiration handler', () => {
      const onExpireMock = vi.fn();
      const unsubscribe = cache.onExpire(onExpireMock);

      cache.set('temp-key', 'ephemeral', { ttlSeconds: 5 });
      expect(cache.get('temp-key')).toBe('ephemeral');

      vi.advanceTimersByTime(5001);

      expect(cache.get('temp-key')).toBeNull();
      expect(cache.has('temp-key')).toBe(false);
      expect(onExpireMock).toHaveBeenCalledWith('temp-key', 'ephemeral');

      unsubscribe();
      cache.set('temp-2', 'val', { ttlSeconds: 1 });
      vi.advanceTimersByTime(2000);
      expect(onExpireMock).toHaveBeenCalledTimes(1);
    });

    it('handles listener errors gracefully during expiration', () => {
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener crashed');
      });
      cache.onExpire(faultyListener);

      cache.set('faulty-key', 'data', { ttlSeconds: 2 });
      vi.advanceTimersByTime(3000);

      expect(faultyListener).toHaveBeenCalled();
      expect(cache.get('faulty-key')).toBeNull();
    });

    it('supports atomic getOrSet to prevent cache stampedes', async () => {
      const fetcher = vi.fn().mockResolvedValue('computed-post-data');

      const [res1, res2] = await Promise.all([
        cache.getOrSet('feed-cache-key', fetcher, { ttlSeconds: 60 }),
        cache.getOrSet('feed-cache-key', fetcher, { ttlSeconds: 60 }),
      ]);

      expect(res1).toBe('computed-post-data');
      expect(res2).toBe('computed-post-data');
      expect(fetcher).toHaveBeenCalledTimes(1);

      const cached = await cache.getOrSet('feed-cache-key', fetcher);
      expect(cached).toBe('computed-post-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('clears and invalidates keys explicitly', () => {
      cache.set('k1', 'v1');
      cache.set('k2', 'v2');
      expect(cache.size()).toBe(2);

      cache.delete('k1');
      expect(cache.get('k1')).toBeNull();
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('InventoryLockManager & Concurrency / Race Conditions', () => {
    let lockManager: InventoryLockManager;

    beforeEach(() => {
      lockManager = new InventoryLockManager();
    });

    it('successfully acquires and releases a lock for an inventory item or post', async () => {
      const lock = await lockManager.acquireLock('post_sticker_lock_100', 'user_session_1', 5000);
      expect(lock.acquired).toBe(true);
      expect(lock.resourceId).toBe('post_sticker_lock_100');
      expect(lockManager.isLocked('post_sticker_lock_100')).toBe(true);

      const renewed = await lockManager.acquireLock('post_sticker_lock_100', 'user_session_1', 8000);
      expect(renewed.acquired).toBe(true);

      const failedRelease = await lockManager.releaseLock('post_sticker_lock_100', 'other_user');
      expect(failedRelease).toBe(false);

      const released = await lockManager.releaseLock('post_sticker_lock_100', 'user_session_1');
      expect(released).toBe(true);
      expect(lockManager.isLocked('post_sticker_lock_100')).toBe(false);

      expect(await lockManager.releaseLock('missing_res', 'user_session_1')).toBe(true);
    });

    it('rejects parallel lock acquisitions on the same resource', async () => {
      const lock1 = await lockManager.acquireLock('exclusive_plot_44', 'user_alpha', 5000);
      expect(lock1.acquired).toBe(true);

      await expect(
        lockManager.acquireLock('exclusive_plot_44', 'user_beta', 5000)
      ).rejects.toThrow(MutexLockError);
    });

    it('auto-releases locks after TTL expiry to prevent deadlocks', async () => {
      vi.useFakeTimers();
      try {
        await lockManager.acquireLock('ephemeral_house_claim', 'user_1', 2000);
        expect(lockManager.isLocked('ephemeral_house_claim')).toBe(true);

        vi.advanceTimersByTime(2500);
        expect(lockManager.isLocked('ephemeral_house_claim')).toBe(false);

        const lock2 = await lockManager.acquireLock('ephemeral_house_claim', 'user_2', 2000);
        expect(lock2.acquired).toBe(true);

        lockManager.clear();
        expect(lockManager.isLocked('ephemeral_house_claim')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('simulates 50 concurrent requests competing for inventory slots and prevents overselling', async () => {
      let availableInventory = 5;
      const successfulClaims: string[] = [];
      const failedClaims: string[] = [];

      const tasks = Array.from({ length: 50 }).map(async (_, idx) => {
        const userId = `concurrent_user_${idx}`;
        try {
          const lock = await lockManager.acquireLockWithRetry(
            'limited_edition_sticker_f022',
            userId,
            1000,
            60,
            15
          );
          try {
            if (availableInventory > 0) {
              availableInventory -= 1;
              successfulClaims.push(userId);
            } else {
              failedClaims.push(userId);
            }
          } finally {
            await lockManager.releaseLock('limited_edition_sticker_f022', userId);
          }
        } catch {
          failedClaims.push(userId);
        }
      });

      await Promise.all(tasks);

      expect(successfulClaims.length).toBe(5);
      expect(availableInventory).toBe(0);
      expect(failedClaims.length).toBe(45);
    });

    it('simulates parallel ledger updates with atomic balance integrity', async () => {
      let ledgerBalance = 100;
      const ledgerLock = new InventoryLockManager();

      const operations = [
        ...Array(10).fill(+5),
        ...Array(10).fill(-5),
      ];

      const tasks = operations.map(async (amount, idx) => {
        const opId = `op_${idx}_${Date.now()}`;
        await ledgerLock.acquireLockWithRetry('user_balance_account', opId, 1000, 50, 10);
        try {
          ledgerBalance += amount;
        } finally {
          await ledgerLock.releaseLock('user_balance_account', opId);
        }
      });

      await Promise.all(tasks);

      expect(ledgerBalance).toBe(100);
    });
  });
});
