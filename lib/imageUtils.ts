/**
 * Helper utility to process uploaded images.
 * Specifically converts HEIC/HEIF images from iOS devices to JPEG
 * so they can be previewed in the browser and uploaded successfully.
 */

export async function processImageFile(file: File): Promise<File> {
  // Check if it's a HEIC file based on extension or mime type
  const isHeic = 
    file.name.toLowerCase().endsWith('.heic') || 
    file.name.toLowerCase().endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  if (!isHeic) {
    return file; // Return original if not HEIC
  }

  try {
    // Dynamically import heic2any to avoid SSR issues
    const heic2any = (await import('heic2any')).default;
    
    // Convert to JPEG
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    });

    // heic2any can return an array of blobs if the image contains multiple frames.
    // We just take the first one.
    const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Convert the Blob back to a File object
    // Give it a generic name with a .jpeg extension
    const newFileName = file.name.replace(/\.heic|\.heif/i, '.jpg');
    return new File([finalBlob], newFileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    // If conversion fails, fallback to returning the original file
    // though this might still cause upload errors, at least it doesn't crash the UI entirely here.
    return file;
  }
}
