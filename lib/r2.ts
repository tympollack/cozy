import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
// Upload helper
// Returns the public URL of the uploaded object.
// ---------------------------------------------------------------------------
export async function uploadToR2(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('Missing R2 env vars: R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL');
  }

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
}

/**
 * Transforms a raw R2 public URL into a Cloudflare optimized URL.
 */
export function getOptimizedImageUrl(rawUrl: string, width: number = 800): string {
  try {
    const url = new URL(rawUrl);
    
    // Cloudflare's magic prefix for image transformations
    const transformPrefix = `/cdn-cgi/image/width=${width},format=auto,quality=75`;
    
    // Combine the domain, the prefix, and the original path
    return `${url.origin}${transformPrefix}${url.pathname}`;
  } catch (error) {
    // Fallback to the raw URL if the string is malformed
    return rawUrl;
  }
}
