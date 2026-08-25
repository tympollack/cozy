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
  const ext = mimeType.split('/')[1] ?? 'jpg';
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
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;

  // Always use local disk storage in development or if R2 credentials are AWS keys (length !== 32)
  if (isLocal || !accessKeyId || accessKeyId.length !== 32 || !bucketName || !publicUrl) {
    return saveToLocalUploads(fileBuffer, key);
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
    console.warn('[uploadToR2] R2 upload failed, falling back to local disk storage:', (err as Error)?.message);
    return saveToLocalUploads(fileBuffer, key);
  }
}

export { getOptimizedImageUrl } from '@/lib/cloudflare';

