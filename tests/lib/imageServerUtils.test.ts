import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeServerImage } from '@/lib/imageServerUtils';

describe('Server-Side Image Optimization (imageServerUtils)', () => {
  it('resizes large images (> 1600px) down to 1600px max dimension maintaining aspect ratio', async () => {
    // Create a 2400x1200 image
    const largeBuffer = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await optimizeServerImage(largeBuffer, 'image/jpeg');

    expect(result.contentType).toBe('image/jpeg');
    expect(result.ext).toBe('jpg');
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it('does not enlarge images smaller than 1600px', async () => {
    // Create an 800x600 image
    const smallBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 50, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await optimizeServerImage(smallBuffer, 'image/jpeg');

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.contentType).toBe('image/jpeg');
  });

  it('preserves PNG format for PNG images with alpha channel', async () => {
    // Create a PNG with alpha channel (4 channels)
    const transparentPngBuffer = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeServerImage(transparentPngBuffer, 'image/png');

    expect(result.contentType).toBe('image/png');
    expect(result.ext).toBe('png');
    expect(result.width).toBe(500);
    expect(result.height).toBe(500);
  });

  it('converts opaque PNG to progressive JPEG to reduce file size', async () => {
    // Create an opaque PNG (3 channels)
    const opaquePngBuffer = await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 3,
        background: { r: 100, g: 200, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const result = await optimizeServerImage(opaquePngBuffer, 'image/png');

    expect(result.contentType).toBe('image/jpeg');
    expect(result.ext).toBe('jpg');
    expect(result.width).toBe(1000);
    expect(result.height).toBe(1000);
  });

  it('gracefully handles corrupted image buffers by returning original buffer as fallback', async () => {
    const invalidBuffer = Buffer.from('not-a-real-image-payload');
    const result = await optimizeServerImage(invalidBuffer, 'image/jpeg');

    expect(result.buffer).toEqual(invalidBuffer);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.ext).toBe('jpg');
  });
});
