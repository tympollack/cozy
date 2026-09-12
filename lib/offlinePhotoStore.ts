'use client';

import { useState, useEffect, useCallback } from 'react';

export interface QueuedPhotoPost {
  id: string;
  createdAt: string;
  lightBlob: Blob | null;
  lightName: string | null;
  darkBlob: Blob | null;
  darkName: string | null;
  location: { lat: number; lng: number } | null;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

const DB_NAME = 'cozy_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'queued_photos';

// In-memory fallback for SSR or environments without IndexedDB (e.g. Node / testing)
const memoryStore = new Map<string, QueuedPhotoPost>();

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('[openDatabase] Failed to open IndexedDB:', request.error);
      resolve(null);
    };
  });
}

/**
 * Saves a photo post into the offline queue.
 */
export async function saveOfflinePost(
  data: Omit<QueuedPhotoPost, 'id' | 'createdAt' | 'status' | 'retryCount'>
): Promise<string> {
  const id = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedPhotoPost = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  const db = await openDatabase();
  if (!db) {
    memoryStore.set(id, item);
    return id;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve(id);
      req.onerror = () => {
        memoryStore.set(id, item);
        resolve(id);
      };
    } catch {
      memoryStore.set(id, item);
      resolve(id);
    }
  });
}

/**
 * Retrieves all queued photos from IndexedDB or memory.
 */
export async function getQueuedPosts(): Promise<QueuedPhotoPost[]> {
  const db = await openDatabase();
  if (!db) {
    return Array.from(memoryStore.values());
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const idbItems: QueuedPhotoPost[] = req.result ?? [];
        const memItems = Array.from(memoryStore.values());
        // Merge without duplicates
        const map = new Map<string, QueuedPhotoPost>();
        for (const item of idbItems) map.set(item.id, item);
        for (const item of memItems) map.set(item.id, item);
        resolve(Array.from(map.values()));
      };

      req.onerror = () => {
        resolve(Array.from(memoryStore.values()));
      };
    } catch {
      resolve(Array.from(memoryStore.values()));
    }
  });
}

/**
 * Removes a post from the offline queue.
 */
export async function removeQueuedPost(id: string): Promise<void> {
  memoryStore.delete(id);
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Updates status or error message on a queued post.
 */
export async function updateQueuedPost(
  id: string,
  updates: Partial<Omit<QueuedPhotoPost, 'id'>>
): Promise<void> {
  const memItem = memoryStore.get(id);
  if (memItem) {
    memoryStore.set(id, { ...memItem, ...updates });
  }

  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          store.put({ ...existing, ...updates });
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Returns count of pending offline posts.
 */
export async function getQueuedCount(): Promise<number> {
  const posts = await getQueuedPosts();
  return posts.length;
}

/**
 * Syncs all pending posts in the queue using the provided upload function.
 */
export async function syncOfflinePhotos(
  uploadFn: (formData: FormData) => Promise<{ success: boolean; error?: string }>
): Promise<{ synced: number; failed: number }> {
  const posts = await getQueuedPosts();
  let synced = 0;
  let failed = 0;

  for (const post of posts) {
    await updateQueuedPost(post.id, { status: 'syncing' });

    const formData = new FormData();
    if (post.lightBlob) {
      formData.append(
        'light',
        new File([post.lightBlob], post.lightName || 'light.jpg', {
          type: post.lightBlob.type || 'image/jpeg',
        })
      );
    }
    if (post.darkBlob) {
      formData.append(
        'dark',
        new File([post.darkBlob], post.darkName || 'dark.jpg', {
          type: post.darkBlob.type || 'image/jpeg',
        })
      );
    }
    if (post.location) {
      formData.append('lat', String(post.location.lat));
      formData.append('lng', String(post.location.lng));
    }

    try {
      const result = await uploadFn(formData);
      if (result.success) {
        await removeQueuedPost(post.id);
        synced++;
      } else {
        await updateQueuedPost(post.id, {
          status: 'failed',
          retryCount: post.retryCount + 1,
          errorMessage: result.error,
        });
        failed++;
      }
    } catch (err) {
      await updateQueuedPost(post.id, {
        status: 'failed',
        retryCount: post.retryCount + 1,
        errorMessage: (err as Error)?.message || 'Sync error',
      });
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * React hook managing offline status, queue count, and automatic background sync.
 */
export function useOfflineSync(
  uploadFn?: (formData: FormData) => Promise<{ success: boolean; error?: string }>
) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(
    null
  );

  const refreshCount = useCallback(async () => {
    const count = await getQueuedCount();
    setQueuedCount(count);
  }, []);

  const runSync = useCallback(async () => {
    if (!uploadFn || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncOfflinePhotos(uploadFn);
      setLastSyncResult(res);
      await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [uploadFn, isSyncing, refreshCount]);

  useEffect(() => {
    refreshCount();

    function handleOnline() {
      setIsOnline(true);
      if (uploadFn) {
        runSync();
      }
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [uploadFn, runSync, refreshCount]);

  return {
    isOnline,
    queuedCount,
    isSyncing,
    lastSyncResult,
    refreshCount,
    syncNow: runSync,
  };
}
