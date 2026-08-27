import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { isLocalDevelopment } from '@/lib/env';

// ---------------------------------------------------------------------------
// R2 S3-compatible client
// Cloudflare R2 endpoint pattern: https://<account-id>.r2.cloudflarestorage.com
// ---------------------------------------------------------------------------
function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// ---------------------------------------------------------------------------
// Key generator
// Pattern: cozy/<userId>/<timestamp>-<mode>.<ext>
// ---------------------------------------------------------------------------
export function generateR2Key(
  userId: string,
  mode: 'light' | 'dark',
  mimeType: string
): string {
  let ext = mimeType.split('/')[1] ?? 'jpg';
  if (ext === 'jpeg') ext = 'jpg';
  const timestamp = Date.now();
  return `cozy/${userId}/${timestamp}-${mode}.${ext}`;
}

// ---------------------------------------------------------------------------
// Local Disk Storage Helper (for local development & fallback)
// ---------------------------------------------------------------------------
async function saveToLocalUploads(fileBuffer: Buffer, key: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'uploads', key);
  const dirPath = path.dirname(filePath);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, fileBuffer);

  return `/uploads/${key}`;
}

// ---------------------------------------------------------------------------
// Upload helper
// Returns the public URL of the uploaded object (R2 in production, local fallback in dev).
// ---------------------------------------------------------------------------
export async function uploadToR2(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const isLocal = isLocalDevelopment();
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const hasR2Credentials = Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrl);

  // If local development without full R2 credentials, save to local uploads directory
  if (isLocal && !hasR2Credentials) {
    return saveToLocalUploads(fileBuffer, key);
  }

  // In production, require R2 configuration
  if (!hasR2Credentials) {
    if (isLocal) {
      return saveToLocalUploads(fileBuffer, key);
    }
    throw new Error('Cloudflare R2 is not configured in production. Missing required R2 environment variables.');
  }

  try {
    const client = createR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // R2 public buckets serve objects directly — no ACL needed
      })
    );

    return `${publicUrl}/${key}`;
  } catch (err: unknown) {
    console.error('[uploadToR2] R2 upload failed:', (err as Error)?.message);
    if (isLocal) {
      console.warn('[uploadToR2] Falling back to local disk storage in local dev environment.');
      return saveToLocalUploads(fileBuffer, key);
    }
    throw new Error(`Failed to upload media to storage: ${(err as Error)?.message || 'Storage error'}`);
  }
}

export { getOptimizedImageUrl } from '@/lib/cloudflare';

