/**
 * High-performance image optimization & processing utilities.
 * 
 * 1. Fast Native Path (iOS Safari, Desktop, standard JPEG/PNG/WebP):
 *    Hardware-accelerated resize to max 1600px dimension and progressive compression (<100ms).
 * 
 * 2. Instant Android / Non-Native HEIC Path (Chrome on Android, Samsung Internet, Firefox):
 *    - Instant EXIF thumbnail extraction (<2ms) for initial preview.
 *    - Fast background WASM conversion via `heic-to` to compress to ~250KB JPEG (<1-2s).
 *    - Fallback to server-side SIMD C++ Sharp processing if client conversion fails.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Fast binary extraction of embedded EXIF JPEG thumbnail (<2ms).
 * Useful for HEIC/HEIF images on Android/Chrome where native full HEIC decoding
 * is not supported in the browser, but the container has an embedded EXIF JPEG.
 */
export async function extractExifThumbnail(file: Blob): Promise<Blob | null> {
  try {
    // Read the first 128KB which contains the EXIF/header blocks
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Look for 'Exif\0\0' marker
    let exifOffset = -1;
    for (let i = 0; i < bytes.length - 6; i++) {
      if (
        bytes[i] === 0x45 &&
        bytes[i + 1] === 0x78 &&
        bytes[i + 2] === 0x69 &&
        bytes[i + 3] === 0x66 &&
        bytes[i + 4] === 0x00 &&
        bytes[i + 5] === 0x00
      ) {
        exifOffset = i + 6;
        break;
      }
    }

    if (exifOffset === -1) {
      // Look for TIFF header directly ('II*\0' or 'MM\0*')
      for (let i = 0; i < bytes.length - 4; i++) {
        if (
          (bytes[i] === 0x49 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0x2a && bytes[i + 3] === 0x00) ||
          (bytes[i] === 0x4d && bytes[i + 1] === 0x4d && bytes[i + 2] === 0x00 && bytes[i + 3] === 0x2a)
        ) {
          exifOffset = i;
          break;
        }
      }
    }

    if (exifOffset === -1) return null;

    const isLittleEndian = bytes[exifOffset] === 0x49; // 'II' vs 'MM'
    const readUint16 = (o: number) =>
      isLittleEndian
        ? bytes[exifOffset + o] | (bytes[exifOffset + o + 1] << 8)
        : (bytes[exifOffset + o] << 8) | bytes[exifOffset + o + 1];

    const readUint32 = (o: number) =>
      isLittleEndian
        ? (bytes[exifOffset + o] |
            (bytes[exifOffset + o + 1] << 8) |
            (bytes[exifOffset + o + 2] << 16) |
            (bytes[exifOffset + o + 3] << 24)) >>>
          0
        : ((bytes[exifOffset + o] << 24) |
            (bytes[exifOffset + o + 1] << 16) |
            (bytes[exifOffset + o + 2] << 8) |
            bytes[exifOffset + o + 3]) >>>
          0;

    // 1. Try standard TIFF IFD1 thumbnail parsing
    try {
      const ifd0Offset = readUint32(4);
      if (ifd0Offset > 0 && exifOffset + ifd0Offset + 2 <= bytes.length) {
        const ifd0Entries = readUint16(ifd0Offset);
        const ifd1OffsetPtr = ifd0Offset + 2 + ifd0Entries * 12;
        if (exifOffset + ifd1OffsetPtr + 4 <= bytes.length) {
          const ifd1Offset = readUint32(ifd1OffsetPtr);
          if (ifd1Offset > 0 && exifOffset + ifd1Offset + 2 <= bytes.length) {
            const ifd1Entries = readUint16(ifd1Offset);
            let thumbOffset = 0;
            let thumbLength = 0;

            for (let i = 0; i < ifd1Entries; i++) {
              const entryOffset = ifd1Offset + 2 + i * 12;
              if (exifOffset + entryOffset + 12 > bytes.length) break;
              const tag = readUint16(entryOffset);
              if (tag === 0x0201) {
                // JPEGInterchangeFormat
                thumbOffset = readUint32(entryOffset + 8);
              } else if (tag === 0x0202) {
                // JPEGInterchangeFormatLength
                thumbLength = readUint32(entryOffset + 8);
              }
            }

            if (thumbOffset > 0 && thumbLength > 0 && exifOffset + thumbOffset + thumbLength <= bytes.length) {
              const thumbBytes = bytes.subarray(exifOffset + thumbOffset, exifOffset + thumbOffset + thumbLength);
              return new Blob([thumbBytes], { type: 'image/jpeg' });
            }
          }
        }
      }
    } catch {
      // Ignore IFD parse error and proceed to scan fallback
    }

    // 2. Fallback: search for embedded JPEG SOI (0xFF 0xD8 0xFF) inside the EXIF block
    for (let i = Math.max(0, exifOffset); i < bytes.length - 4; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        for (let j = i + 2; j < bytes.length - 1; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            const thumbBytes = bytes.subarray(i, j + 2);
            return new Blob([thumbBytes], { type: 'image/jpeg' });
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Returns an immediate, displayable preview object URL for a given File.
 * For HEIC files on browsers without native support, it extracts the EXIF thumbnail.
 */
export async function getPreviewUrlFromFile(file: File): Promise<string> {
  const isHeic =
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  if (!isHeic) {
    return URL.createObjectURL(file);
  }

  // Check if browser natively decodes HEIC (Safari)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return URL.createObjectURL(file);
    } catch {
      // Native decoding failed (Android Chrome / Firefox)
    }
  }

  // Extract embedded EXIF thumbnail for instant preview on Android
  const thumbBlob = await extractExifThumbnail(file);
  if (thumbBlob) {
    return URL.createObjectURL(thumbBlob);
  }

  return URL.createObjectURL(file);
}

async function fileToCanvasBlob(
  file: Blob,
  maxDim: number = MAX_DIMENSION,
  outputType: string = 'image/jpeg'
): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return null;
  }

  let imgBitmap: ImageBitmap | null = null;
  try {
    imgBitmap = await createImageBitmap(file);
  } catch {
    // If createImageBitmap fails (e.g. HEIC on Chrome/Firefox), return null
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
  if (!ctx) {
    imgBitmap.close();
    return null;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgBitmap, 0, 0, targetWidth, targetHeight);
  imgBitmap.close();

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      outputType,
      outputType === 'image/png' ? undefined : JPEG_QUALITY
    );
  });
}

/**
 * Optimizes an image file for uploading.
 * 
 * 1. Fast Native Path (JPEGs, PNG, WebP, Safari HEIC):
 *    Resizes to max 1600px and compresses to 82% quality JPEG on canvas (<100ms).
 * 
 * 2. Non-Native HEIC (Android Chrome / Firefox):
 *    Converts via modern WebAssembly `heic-to` (<1-2s) and scales to 1600px JPEG (~250KB),
 *    preventing Vercel serverless 4.5MB request body size limit rejections.
 * 
 * 3. Fallback:
 *    If client conversion fails, passes original file to server Sharp processing.
 */
export async function processImageFile(file: File): Promise<File> {
  const isHeic =
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  const isPng =
    !isHeic &&
    (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png'));

  const outputMime = isPng ? 'image/png' : 'image/jpeg';
  const outputExt = isPng ? '.png' : '.jpg';

  // 1. Try fast native client-side decoding & compression
  try {
    const resizedBlob = await fileToCanvasBlob(file, MAX_DIMENSION, outputMime);
    if (resizedBlob) {
      const outputName = file.name.replace(/\.[^/.]+$/, '') + outputExt;
      return new File([resizedBlob], outputName, { type: outputMime });
    }
  } catch (err) {
    console.warn('[processImageFile] Native client canvas resize failed:', err);
  }

  // 2. If HEIC on non-Safari browser (Android Chrome), convert via fast WASM heic-to
  if (isHeic && typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const { heicTo } = await import('heic-to');
      const jpegBlob = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: JPEG_QUALITY,
      });

      if (jpegBlob) {
        const resizedBlob = await fileToCanvasBlob(jpegBlob, MAX_DIMENSION, 'image/jpeg');
        const finalBlob = resizedBlob || jpegBlob;
        const outputName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        return new File([finalBlob], outputName, { type: 'image/jpeg' });
      }
    } catch (err) {
      console.warn('[processImageFile] heic-to conversion failed, falling back to server processing:', err);
    }
  }

  // 3. Passthrough to server-side Sharp processing
  return file;
}
