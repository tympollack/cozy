/**
 * Helper utility to process and optimize uploaded images.
 * 1. Converts HEIC/HEIF images (iOS) using fast native browser decoding where supported,
 *    falling back to heic2any only on non-Safari browsers.
 * 2. Resizes large high-res photos to max 1600px dimension and compresses to 82% quality JPEG.
 *    This reduces upload payloads from ~12MB down to ~300KB (95%+ reduction),
 *    dramatically reducing camera processing and network upload latency.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

async function fileToCanvasBlob(file: Blob, maxDim: number = MAX_DIMENSION): Promise<Blob | null> {
  let imgBitmap: ImageBitmap | null = null;
  try {
    imgBitmap = await createImageBitmap(file);
  } catch {
    // If createImageBitmap fails (e.g. HEIC on Chrome/Firefox), return null to use fallback
    return null;
  }

  const { width, height } = imgBitmap;
  let targetWidth = width;
  let targetHeight = height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      targetWidth = maxDim;
      targetHeight = Math.round((height * maxDim) / width);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round((width * maxDim) / height);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgBitmap, 0, 0, targetWidth, targetHeight);
  imgBitmap.close();

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
  });
}

export async function processImageFile(file: File): Promise<File> {
  const isHeic =
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  let currentBlob: Blob = file;

  // Step 1: Handle HEIC decoding / conversion
  if (isHeic) {
    // Try native decoding first (fast hardware-accelerated path on iOS Safari)
    const nativeResized = await fileToCanvasBlob(file);
    if (nativeResized) {
      const newName = file.name.replace(/\.heic|\.heif/i, '.jpg');
      return new File([nativeResized], newName, { type: 'image/jpeg' });
    }

    // Fallback to heic2any if native decoding failed (e.g. Chrome on Windows)
    try {
      const heic2any = (await import('heic2any')).default;
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: JPEG_QUALITY,
      });
      currentBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error('HEIC conversion error:', err);
    }
  }

  // Step 2: Compress and resize JPEG/PNG/Converted HEIC to 1600px max
  try {
    const resizedBlob = await fileToCanvasBlob(currentBlob);
    if (resizedBlob) {
      const outputName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
      return new File([resizedBlob], outputName, { type: 'image/jpeg' });
    }
  } catch (err) {
    console.error('Image compression error:', err);
  }

  return file;
}
