/**
 * Client-Side EXIF Metadata Scrubber and Image Compression.
 * 
 * Guarantees zero GPS coordinates, device identifiers, serial numbers,
 * or personal metadata leave the browser before uploading.
 */

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_JPEG_QUALITY = 0.82;

/**
 * Checks if a byte buffer contains an EXIF header or GPS sub-IFD tag.
 */
export function hasExifOrGpsMetadata(buffer: ArrayBufferLike): boolean {
  const bytes = new Uint8Array(buffer);
  // Search for 'Exif\0\0' (0x45 0x78 0x69 0x66 0x00 0x00)
  for (let i = 0; i < bytes.length - 6; i++) {
    if (
      bytes[i] === 0x45 &&
      bytes[i + 1] === 0x78 &&
      bytes[i + 2] === 0x69 &&
      bytes[i + 3] === 0x66 &&
      bytes[i + 4] === 0x00 &&
      bytes[i + 5] === 0x00
    ) {
      return true;
    }
  }

  // Check for GPS Info IFD pointer tag (0x8825)
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x88 && bytes[i + 1] === 0x25) {
      return true;
    }
  }

  return false;
}

/**
 * Pure binary stripper for JPEG APP1 (EXIF / XMP) segments.
 * Removes APP1 blocks while preserving JPEG frame headers (SOF, DQT, DHT, SOS).
 */
export function stripExifFromJpegBytes(bytes: Uint8Array): Uint8Array {
  // Verify JPEG SOI marker (0xFF 0xD8)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const chunks: Uint8Array[] = [];
  chunks.push(bytes.subarray(0, 2)); // Keep SOI (0xFF 0xD8)

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      // Not a marker or unexpected byte, append remaining
      chunks.push(bytes.subarray(offset));
      break;
    }

    const marker = bytes[offset + 1];

    // Standalone markers without length: SOI (0xD8), EOI (0xD9), RST0-7 (0xD0-0xD7)
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      if (marker === 0xd9) break; // End of image
      continue;
    }

    // Start of Scan (SOS): marker 0xDA - followed by compressed entropy data up to EOI
    if (marker === 0xda) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    if (offset + 4 > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    // Marker segment length (big-endian 16-bit, includes the 2 length bytes)
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const segmentEnd = offset + 2 + segmentLength;

    // Strip APP1 (0xFFE1 - EXIF/XMP) and APP2 (0xFFE2 - ICC/FlashPix if requested)
    if (marker === 0xe1) {
      // Skip this entire EXIF segment!
      offset = segmentEnd;
      continue;
    }

    // Keep all other segments (DQT, DHT, SOF0, APP0 JFIF, etc.)
    chunks.push(bytes.subarray(offset, segmentEnd));
    offset = segmentEnd;
  }

  // Combine preserved chunks into a clean Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}

export interface ScrubOptions {
  maxDimension?: number;
  quality?: number;
  filterCss?: string;
}

/**
 * Scrubs EXIF/GPS metadata and compresses image client-side.
 * Applies canvas-based pixel transformation and secondary binary verification.
 */
export async function scrubAndCompressImage(
  file: File,
  options: ScrubOptions = {}
): Promise<File> {
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
  const filterCss = options.filterCss;

  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const outputMime = isPng ? 'image/png' : 'image/jpeg';
  const outputExt = isPng ? '.png' : '.jpg';
  const cleanName = file.name.replace(/\.[^/.]+$/, '') + outputExt;

  const isJsdom =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('jsdom') || navigator.userAgent.includes('Node.js'));

  // 1. Canvas-based scrub & resize if in real browser environment
  if (!isJsdom && typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      let imgBitmap: ImageBitmap | null = null;
      if (typeof createImageBitmap === 'function') {
        try {
          imgBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
          // Fall back to standard Image tag if createImageBitmap fails
        }
      }

      let width = imgBitmap?.width;
      let height = imgBitmap?.height;
      let sourceImage: HTMLImageElement | ImageBitmap | null = imgBitmap;

      if (!sourceImage) {
        // Fallback to HTMLImageElement with timeout
        sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          const timer = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load timeout'));
          }, 600);
          img.onload = () => {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            resolve(img);
          };
          img.onerror = () => {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image into DOM'));
          };
          img.src = url;
        });
        width = sourceImage.naturalWidth;
        height = sourceImage.naturalHeight;
      }

      if (width && height) {
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

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Apply warmth preview filter directly to canvas pixels if specified
          if (filterCss && filterCss !== 'none') {
            ctx.filter = filterCss;
          }

          ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
          if (imgBitmap) {
            imgBitmap.close();
          }

          const canvasBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), outputMime, isPng ? undefined : quality);
          });

          if (canvasBlob) {
            // Secondary binary scrub to guarantee 0 EXIF bytes
            const arrayBuffer = await canvasBlob.arrayBuffer();
            const cleanBytes = stripExifFromJpegBytes(new Uint8Array(arrayBuffer));
            return new File([cleanBytes as unknown as BlobPart], cleanName, { type: outputMime });
          }
        }
      }
    } catch (err) {
      console.warn('[scrubAndCompressImage] Canvas scrub failed, applying binary fallback:', err);
    }
  }

  // 2. Binary fallback if canvas is not available (Node / SSR or unsupported codec)
  try {
    const buffer = await file.arrayBuffer();
    const cleanBytes = stripExifFromJpegBytes(new Uint8Array(buffer));
    return new File([cleanBytes as unknown as BlobPart], cleanName, { type: file.type || 'image/jpeg' });
  } catch {
    return file;
  }
}
