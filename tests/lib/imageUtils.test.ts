import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processImageFile, getPreviewUrlFromFile, extractExifThumbnail } from '@/lib/imageUtils';

describe('Client-Side Image Utilities (imageUtils)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('processImageFile', () => {
    it('passes through HEIC files instantly without blocking the client', async () => {
      const heicBlob = new Blob(['mock-heic-data'], { type: 'image/heic' });
      const heicFile = new File([heicBlob], 'photo.heic', { type: 'image/heic' });

      const startTime = performance.now();
      const result = await processImageFile(heicFile);
      const elapsed = performance.now() - startTime;

      expect(result).toBe(heicFile);
      expect(elapsed).toBeLessThan(100); // Must be instant (<100ms)
    });

    it('handles non-HEIC files gracefully when canvas/createImageBitmap is not available in environment', async () => {
      const jpgBlob = new Blob(['mock-jpg-data'], { type: 'image/jpeg' });
      const jpgFile = new File([jpgBlob], 'photo.jpg', { type: 'image/jpeg' });

      const result = await processImageFile(jpgFile);
      expect(result).toBeDefined();
      expect(result.name).toBe('photo.jpg');
    });
  });

  describe('getPreviewUrlFromFile', () => {
    it('returns an object URL immediately for JPEG files', async () => {
      const file = new File(['fake-jpeg-content'], 'test.jpg', { type: 'image/jpeg' });
      const url = await getPreviewUrlFromFile(file);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('handles HEIC files and returns an object URL', async () => {
      const file = new File(['fake-heic-content'], 'test.heic', { type: 'image/heic' });
      const url = await getPreviewUrlFromFile(file);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });
  });

  describe('extractExifThumbnail', () => {
    it('returns null if no EXIF header or thumbnail exists in the blob', async () => {
      const emptyBlob = new Blob(['not-an-exif-image']);
      const thumb = await extractExifThumbnail(emptyBlob);
      expect(thumb).toBeNull();
    });

    it('extracts embedded JPEG when EXIF SOI marker is present', async () => {
      // Construct a mock buffer containing 'Exif\0\0' followed by a fake JPEG stream (FF D8 FF ... FF D9)
      const fakeJpeg = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9];
      const header = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x49, 0x49, 0x2a, 0x00]; // 'Exif\0\0II*\0'
      const padding = new Array(50).fill(0);
      const combined = new Uint8Array([...header, ...padding, ...fakeJpeg]);

      const blob = new Blob([combined]);
      const thumb = await extractExifThumbnail(blob);

      expect(thumb).not.toBeNull();
      expect(thumb?.type).toBe('image/jpeg');
    });
  });
});
