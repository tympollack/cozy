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

  public async acquireLock(
    resourceId: string,
    holderId: string,
    ttlMs = 5000
  ): Promise<LockHandle> {
    const now = Date.now();
    const current = this.locks.get(resourceId);

    if (current && current.expiresAt > now) {
      if (current.holderId === holderId) {
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

    const expiresAt = now + ttlMs;
    this.locks.set(resourceId, { holderId, expiresAt });

    return {
      resourceId,
      holderId,
      acquired: true,
      expiresAt,
    };
  }

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

  public async releaseLock(resourceId: string, holderId: string): Promise<boolean> {
    const current = this.locks.get(resourceId);
    if (!current) return true;

    if (current.holderId === holderId) {
      this.locks.delete(resourceId);
      return true;
    }

    return false;
  }

  public isLocked(resourceId: string): boolean {
    const current = this.locks.get(resourceId);
    if (!current) return false;
    if (Date.now() >= current.expiresAt) {
      this.locks.delete(resourceId);
      return false;
    }
    return true;
  }

  public clear(): void {
    this.locks.clear();
  }
}

export const globalInventoryLockManager = new InventoryLockManager();
