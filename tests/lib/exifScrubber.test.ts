import { describe, it, expect } from 'vitest';
import {
  hasExifOrGpsMetadata,
  stripExifFromJpegBytes,
  scrubAndCompressImage,
} from '@/lib/exifScrubber';

describe('EXIF Metadata Scrubber & Compression', () => {
  it('detects EXIF and GPS markers in byte buffers', () => {
    // Clean JPEG without EXIF
    const cleanBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x01, 0x02]);
    expect(hasExifOrGpsMetadata(cleanBytes.buffer)).toBe(false);

    // Buffer with 'Exif\0\0'
    const exifBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x49, 0x49, 0x2a, 0x00,
    ]);
    expect(hasExifOrGpsMetadata(exifBytes.buffer)).toBe(true);

    // Buffer with GPS IFD tag (0x88 0x25)
    const gpsBytes = new Uint8Array([0xff, 0xd8, 0x01, 0x02, 0x88, 0x25, 0x00, 0x04]);
    expect(hasExifOrGpsMetadata(gpsBytes.buffer)).toBe(true);
  });

  it('strips APP1 EXIF segment from JPEG byte stream while preserving JPEG structure', () => {
    // Construct mock JPEG with APP1 (EXIF) segment and DQT segment
    // SOI: 0xFF 0xD8
    // APP1: 0xFF 0xE1 (length 8: 0x00, 0x08, 'Exif\0\0')
    // DQT: 0xFF 0xDB (length 4: 0x00, 0x04, 0x11, 0x22)
    // SOS: 0xFF 0xDA (compressed payload)
    const mockJpegWithExif = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 EXIF
      0xff, 0xdb, 0x00, 0x04, 0x11, 0x22, // DQT
      0xff, 0xda, 0xaa, 0xbb, // SOS + payload
      0xff, 0xd9, // EOI
    ]);

    expect(hasExifOrGpsMetadata(mockJpegWithExif.buffer)).toBe(true);

    const strippedBytes = stripExifFromJpegBytes(mockJpegWithExif);

    // After stripping, APP1 segment must be completely gone
    expect(hasExifOrGpsMetadata(strippedBytes.buffer)).toBe(false);
    expect(strippedBytes[0]).toBe(0xff);
    expect(strippedBytes[1]).toBe(0xd8); // SOI intact
    expect(strippedBytes[2]).toBe(0xff);
    expect(strippedBytes[3]).toBe(0xdb); // DQT follows immediately after SOI
  });

  it('scrubs EXIF metadata and produces a clean File object', async () => {
    const mockJpegContent = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // EXIF
      0xff, 0xdb, 0x00, 0x04, 0x11, 0x22,
      0xff, 0xd9,
    ]);

    const file = new File([mockJpegContent], 'photo_with_gps.jpg', { type: 'image/jpeg' });
    const cleanFile = await scrubAndCompressImage(file);

    expect(cleanFile).toBeInstanceOf(File);
    expect(cleanFile.name).toBe('photo_with_gps.jpg');

    const cleanBuffer = await cleanFile.arrayBuffer();
    expect(hasExifOrGpsMetadata(cleanBuffer)).toBe(false);
  });
});
