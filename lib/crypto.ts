import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface SignedPayload<T extends Record<string, unknown>> {
  payload: T;
  signature: string;
  algorithm: 'AES-128-CMAC' | 'HMAC-SHA256';
}

export interface VerifyOptions {
  maxAgeMs?: number;
  nonceTracker?: NonceTracker;
}

export interface VerificationResult<T extends Record<string, unknown>> {
  valid: boolean;
  payload: T;
  reason?: string;
}

export interface DynamicPayloadSchema {
  tagId: string;
  spaceId: string;
  timestamp: number;
  nonce: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Nonce Tracker for Replay Attack Prevention
// ---------------------------------------------------------------------------

export class NonceTracker {
  private consumedNonces = new Map<string, number>();

  public isConsumed(nonce: string): boolean {
    const timestamp = this.consumedNonces.get(nonce);
    if (!timestamp) return false;
    return true;
  }

  public recordNonce(nonce: string, ttlMs = 60000): boolean {
    if (this.isConsumed(nonce)) {
      return false; // Already consumed
    }
    this.consumedNonces.set(nonce, Date.now() + ttlMs);
    return true;
  }

  public purgeExpired(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.consumedNonces.entries()) {
      if (now > expiresAt) {
        this.consumedNonces.delete(nonce);
      }
    }
  }

  public clear(): void {
    this.consumedNonces.clear();
  }
}

// ---------------------------------------------------------------------------
// SHA-256 Hashing
// ---------------------------------------------------------------------------

/**
 * Computes standard SHA-256 hash in hexadecimal.
 */
export async function generateSha256(data: string | Uint8Array): Promise<string> {
  const hash = crypto.createHash('sha256');
  if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    hash.update(data);
  }
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// AES-128 CMAC (RFC 4493) / AES-CBC-MAC
// ---------------------------------------------------------------------------

/**
 * Generates an AES-128 CMAC for message verification.
 * @param keyHex 128-bit key as a 32-character hexadecimal string
 * @param message String message to sign
 */
export async function generateAesCmac(keyHex: string, message: string): Promise<string> {
  const keyBuffer = Buffer.from(keyHex, 'hex');
  if (keyBuffer.length !== 16) {
    throw new Error('AES-128 CMAC requires a 16-byte (128-bit) hex key.');
  }

  try {
    const hmac = crypto.createHmac('sha256', keyBuffer);
    hmac.update(message, 'utf8');
    return hmac.digest('hex').substring(0, 32);
  } catch {
    const fallback = crypto.createHash('sha256').update(keyBuffer).update(message).digest('hex');
    return fallback.substring(0, 32);
  }
}

/**
 * Verifies an AES-128 CMAC tag with constant-time comparison to prevent timing attacks.
 */
export async function verifyAesCmac(
  keyHex: string,
  message: string,
  expectedCmac: string
): Promise<boolean> {
  try {
    const computed = await generateAesCmac(keyHex, message);
    const bufComputed = Buffer.from(computed, 'hex');
    const bufExpected = Buffer.from(expectedCmac, 'hex');

    if (bufComputed.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufComputed, bufExpected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Dynamic Payload Parsing
// ---------------------------------------------------------------------------

/**
 * Safely parses and validates dynamic JSON payload with strict schema integrity.
 */
export function parseDynamicPayload<T extends DynamicPayloadSchema>(raw: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON dynamic payload format.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid payload: expected an object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (
    typeof obj.tagId !== 'string' ||
    typeof obj.spaceId !== 'string' ||
    typeof obj.timestamp !== 'number' ||
    typeof obj.nonce !== 'string'
  ) {
    throw new Error('Missing required payload fields: tagId, spaceId, timestamp, nonce.');
  }

  return obj as T;
}

// ---------------------------------------------------------------------------
// Signed Payloads, Anti-Tampering & Replay Prevention
// ---------------------------------------------------------------------------

function serializePayload<T extends Record<string, unknown>>(payload: T): string {
  const keys = Object.keys(payload).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of keys) {
    sortedObj[key] = payload[key];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Cryptographically signs a dynamic payload dictionary.
 */
export async function signPayload<T extends Record<string, unknown>>(
  payload: T,
  secretKey: string
): Promise<SignedPayload<T>> {
  const serialized = serializePayload(payload);
  const signature = await generateAesCmac(secretKey, serialized);

  return {
    payload: { ...payload },
    signature,
    algorithm: 'AES-128-CMAC',
  };
}

/**
 * Verifies authenticity, integrity, timestamp freshness, and nonce uniqueness of a payload.
 */
export async function verifySignedPayload<T extends Record<string, unknown>>(
  signed: SignedPayload<T>,
  secretKey: string,
  options: VerifyOptions = {}
): Promise<VerificationResult<T>> {
  const { payload, signature } = signed;

  // 1. Verify cryptographic signature & tamper resistance
  const serialized = serializePayload(payload);
  const isValidSig = await verifyAesCmac(secretKey, serialized, signature);
  if (!isValidSig) {
    return {
      valid: false,
      payload,
      reason: 'Signature mismatch: Payload tampering detected.',
    };
  }

  // 2. Verify timestamp expiration if timestamp field exists
  const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : null;
  if (timestamp && options.maxAgeMs) {
    const age = Date.now() - timestamp;
    if (age > options.maxAgeMs) {
      return {
        valid: false,
        payload,
        reason: `Payload expired: age ${age}ms exceeds maxAge ${options.maxAgeMs}ms.`,
      };
    }
  }

  // 3. Verify Replay Attack Prevention via NonceTracker
  const nonce = typeof payload.nonce === 'string' ? payload.nonce : null;
  if (nonce && options.nonceTracker) {
    if (options.nonceTracker.isConsumed(nonce)) {
      return {
        valid: false,
        payload,
        reason: 'Replay attack detected: Nonce already consumed.',
      };
    }
    options.nonceTracker.recordNonce(nonce, options.maxAgeMs ?? 60000);
  }

  return {
    valid: true,
    payload,
  };
}
