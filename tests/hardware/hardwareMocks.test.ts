import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MockNDEFReader,
  MockMediaDevices,
  MockGeolocation,
  MockNDEFReadingEvent,
} from '@/tests/mocks/hardware';
import { memoryR2Storage, memoryRedisCache } from '@/tests/mocks/storage';
import { server } from '@/tests/mocks/network';

describe('Hardware, Storage & Network Boundary Mocks', () => {
  beforeEach(() => {
    server.listen();
    memoryR2Storage.clear();
    memoryRedisCache.clear();
  });

  afterEach(() => {
    server.close();
  });

  describe('Web NFC API Mock (NDEFReader)', () => {
    it('simulates scanning and reading NDEF records', async () => {
      const ndef = new MockNDEFReader();
      await ndef.scan();

      const onReading = vi.fn();
      ndef.addEventListener('reading', onReading);

      ndef.simulateScan('04:A1:B2:C3:D4:E5:F6', [
        {
          recordType: 'text',
          data: 'cozy://space/cottage-42',
        },
      ]);

      expect(onReading).toHaveBeenCalledTimes(1);
      const event = onReading.mock.calls[0][0] as MockNDEFReadingEvent;
      expect(event.serialNumber).toBe('04:A1:B2:C3:D4:E5:F6');
      expect(event.message.records[0].data).toBe('cozy://space/cottage-42');
    });

    it('simulates scan error event handling', async () => {
      const ndef = new MockNDEFReader();
      await ndef.scan();

      const onError = vi.fn();
      ndef.addEventListener('readingerror', onError);

      ndef.simulateScanError(new Error('NFC Tag Read Failed'));
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Camera & MediaDevices Mock', () => {
    it('requests user media and returns video stream with active tracks', async () => {
      const mediaDevices = new MockMediaDevices();
      const stream = await mediaDevices.getUserMedia({ video: true });

      expect(stream.active).toBe(true);
      const videoTracks = stream.getVideoTracks();
      expect(videoTracks).toHaveLength(1);
      expect(videoTracks[0].readyState).toBe('live');

      // Stopping track updates readyState to ended
      videoTracks[0].stop();
      expect(videoTracks[0].readyState).toBe('ended');
    });

    it('throws error when user denies camera permissions', async () => {
      const mediaDevices = new MockMediaDevices();
      mediaDevices.setShouldFail(true, new Error('NotAllowedError: Permission denied'));

      await expect(mediaDevices.getUserMedia({ video: true })).rejects.toThrow(
        /Permission denied/
      );
    });
  });

  describe('Geolocation API Mock', () => {
    it('retrieves current coordinates with precision', () => {
      const geo = new MockGeolocation();
      geo.setLocation(37.7749, -122.4194, 5);

      const onSuccess = vi.fn();
      geo.getCurrentPosition(onSuccess);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      const pos = onSuccess.mock.calls[0][0] as GeolocationPosition;
      expect(pos.coords.latitude).toBeCloseTo(37.7749);
      expect(pos.coords.longitude).toBeCloseTo(-122.4194);
      expect(pos.coords.accuracy).toBe(5);
    });

    it('handles location permission denial or unavailable GPS', () => {
      const geo = new MockGeolocation();
      geo.setError(1); // PERMISSION_DENIED

      const onSuccess = vi.fn();
      const onError = vi.fn();
      geo.getCurrentPosition(onSuccess, onError);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      const err = onError.mock.calls[0][0] as GeolocationPositionError;
      expect(err.code).toBe(1);
    });
  });

  describe('In-Memory Storage & Redis Cache Boundary Mocks', () => {
    it('persists and retrieves objects from in-memory R2 bucket', async () => {
      const buffer = Buffer.from('mock-photo-content');
      await memoryR2Storage.putObject('cozy-bucket', 'user1/light.jpg', buffer, 'image/jpeg');

      const obj = await memoryR2Storage.getObject('cozy-bucket', 'user1/light.jpg');
      expect(obj).not.toBeNull();
      expect(obj?.contentType).toBe('image/jpeg');
      expect(obj?.size).toBe(buffer.length);

      const has = await memoryR2Storage.hasObject('cozy-bucket', 'user1/light.jpg');
      expect(has).toBe(true);

      await memoryR2Storage.deleteObject('cozy-bucket', 'user1/light.jpg');
      expect(await memoryR2Storage.hasObject('cozy-bucket', 'user1/light.jpg')).toBe(false);
    });

    it('manages Redis cache keys, TTL, and expiration', async () => {
      await memoryRedisCache.set('session:1', 'active_session', 10);
      expect(await memoryRedisCache.get('session:1')).toBe('active_session');
      expect(await memoryRedisCache.exists('session:1')).toBe(1);

      const ttl = await memoryRedisCache.ttl('session:1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });
  });

  describe('MSW Network Interception', () => {
    it('intercepts mocked Lob.com postcard trigger endpoint', async () => {
      const res = await fetch('https://api.lob.com/v1/postcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Cozy House Verification' }),
      });
      const data = (await res.json()) as { id: string; status: string };
      expect(data.id).toBe('psc_mock_123456789');
      expect(data.status).toBe('rendered');
    });
  });
});
