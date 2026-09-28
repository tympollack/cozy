import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveOfflinePost,
  getQueuedPosts,
  removeQueuedPost,
  getQueuedCount,
  syncOfflinePhotos,
} from '@/lib/offlinePhotoStore';

describe('IndexedDB Offline Photo Queue Store', () => {
  beforeEach(async () => {
    const existing = await getQueuedPosts();
    for (const item of existing) {
      await removeQueuedPost(item.id);
    }
  });

  it('saves offline photo post to queue and retrieves it', async () => {
    const lightBlob = new Blob(['mock-light-photo'], { type: 'image/jpeg' });
    const darkBlob = new Blob(['mock-dark-photo'], { type: 'image/jpeg' });

    const id = await saveOfflinePost({
      lightBlob,
      lightName: 'light.jpg',
      darkBlob,
      darkName: 'dark.jpg',
      location: { lat: 37.7749, lng: -122.4194 },
    });

    expect(id).toMatch(/^queued_/);

    const count = await getQueuedCount();
    expect(count).toBe(1);

    const posts = await getQueuedPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe(id);
    expect(posts[0].lightName).toBe('light.jpg');
    expect(posts[0].status).toBe('pending');
  });

  it('syncs offline photos successfully and clears them from queue', async () => {
    const mockBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });
    await saveOfflinePost({
      lightBlob: mockBlob,
      lightName: 'light.jpg',
      darkBlob: null,
      darkName: null,
      location: null,
    });

    const mockUpload = vi.fn().mockResolvedValue({ success: true });
    const result = await syncOfflinePhotos(mockUpload);

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockUpload).toHaveBeenCalled();

    const remaining = await getQueuedCount();
    expect(remaining).toBe(0);
  });

  it('handles sync failures without removing post from queue', async () => {
    const mockBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });
    await saveOfflinePost({
      lightBlob: mockBlob,
      lightName: 'light.jpg',
      darkBlob: null,
      darkName: null,
      location: null,
    });

    const mockUpload = vi.fn().mockResolvedValue({ success: false, error: 'Network timeout' });
    const result = await syncOfflinePhotos(mockUpload);

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    const remaining = await getQueuedPosts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].status).toBe('failed');
    expect(remaining[0].errorMessage).toBe('Network timeout');
  });
});
