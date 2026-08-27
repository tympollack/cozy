// ---------------------------------------------------------------------------
// Error Classes & Types
// ---------------------------------------------------------------------------

export class MutexLockError extends Error {
  constructor(resourceId: string, holderId?: string) {
    super(
      `Resource '${resourceId}' is currently locked${holderId ? ` by '${holderId}'` : ''}.`
    );
    this.name = 'MutexLockError';
  }
}

export interface LockHandle {
  resourceId: string;
  holderId: string;
  acquired: boolean;
  expiresAt: number;
}

interface LockRecord {
  holderId: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// InventoryLockManager
// ---------------------------------------------------------------------------

export class InventoryLockManager {
  private locks = new Map<string, LockRecord>();

  /**
   * Attempts to acquire an exclusive lock on a resource.
   * Throws MutexLockError if already locked by another holder.
   */
  public async acquireLock(
    resourceId: string,
    holderId: string,
    ttlMs = 5000
  ): Promise<LockHandle> {
    const now = Date.now();
    const current = this.locks.get(resourceId);

    // If lock exists and is active
    if (current && current.expiresAt > now) {
      if (current.holderId === holderId) {
        // Re-entrant renewal
        current.expiresAt = now + ttlMs;
        return {
          resourceId,
          holderId,
          acquired: true,
          expiresAt: current.expiresAt,
        };
      }
      throw new MutexLockError(resourceId, current.holderId);
    }

    // Set lock
    const expiresAt = now + ttlMs;
    this.locks.set(resourceId, { holderId, expiresAt });

    return {
      resourceId,
      holderId,
      acquired: true,
      expiresAt,
    };
  }

  /**
   * Attempts to acquire a lock with backoff retries.
   */
  public async acquireLockWithRetry(
    resourceId: string,
    holderId: string,
    ttlMs = 5000,
    maxRetries = 10,
    retryDelayMs = 25
  ): Promise<LockHandle> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await this.acquireLock(resourceId, holderId, ttlMs);
      } catch (err) {
        if (err instanceof MutexLockError) {
          attempts++;
          if (attempts >= maxRetries) {
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        } else {
          throw err;
        }
      }
    }
    throw new MutexLockError(resourceId);
  }

  /**
   * Releases an acquired lock if the holder matches.
   */
  public async releaseLock(resourceId: string, holderId: string): Promise<boolean> {
    const current = this.locks.get(resourceId);
    if (!current) return true; // Already released or expired

    if (current.holderId === holderId) {
      this.locks.delete(resourceId);
      return true;
    }

    return false;
  }

  /**
   * Checks if a resource is currently locked.
   */
  public isLocked(resourceId: string): boolean {
    const current = this.locks.get(resourceId);
    if (!current) return false;
    if (Date.now() >= current.expiresAt) {
      this.locks.delete(resourceId);
      return false;
    }
    return true;
  }

  /**
   * Clears all locks.
   */
  public clear(): void {
    this.locks.clear();
  }
}

export const globalInventoryLockManager = new InventoryLockManager();
