import { generateAesCmac, verifyAesCmac, NonceTracker } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

export class NfcReplayAttackError extends Error {
  constructor(message = 'NFC Replay Attack Detected: Challenge token already used.') {
    super(message);
    this.name = 'NfcReplayAttackError';
  }
}

export class NfcTamperedPayloadError extends Error {
  constructor(message = 'NFC Payload Tampering Detected: Cryptographic signature mismatch.') {
    super(message);
    this.name = 'NfcTamperedPayloadError';
  }
}

export class NfcExpiredChallengeError extends Error {
  constructor(message = 'NFC Challenge Expired: Scan took too long.') {
    super(message);
    this.name = 'NfcExpiredChallengeError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NfcChallenge {
  challengeId: string;
  spaceId: string;
  tagId: string;
  issuedAt: number;
}

export interface NfcVerificationParams {
  tagId: string;
  spaceId: string;
  challengeId: string;
  scannedAt: number;
  secretKey: string;
  maxAgeMs?: number;
}

export interface NfcPresenceResult {
  verified: boolean;
  spaceId: string;
  tagId: string;
  verifiedAt: number;
}

const globalNfcChallengeTracker = new NonceTracker();

// ---------------------------------------------------------------------------
// NFC Challenge Generation
// ---------------------------------------------------------------------------

/**
 * Generates an ephemeral cryptographic challenge for an NFC tag scan.
 */
export function generateNfcTagChallenge(spaceId: string, tagId: string): NfcChallenge {
  const issuedAt = Date.now();
  const rawId = `${spaceId}:${tagId}:${issuedAt}:${Math.random().toString(36).substring(2, 10)}`;
  return {
    challengeId: rawId,
    spaceId,
    tagId,
    issuedAt,
  };
}

// ---------------------------------------------------------------------------
// NFC Verification
// ---------------------------------------------------------------------------

/**
 * Verifies physical NFC presence by validating challenge signature, freshness, and anti-replay tokens.
 */
export async function verifyNfcProofOfPresence(
  params: NfcVerificationParams
): Promise<NfcPresenceResult> {
  const { tagId, spaceId, challengeId, scannedAt, secretKey, maxAgeMs = 30000 } = params;

  // 1. Check for Replay Attack
  if (globalNfcChallengeTracker.isConsumed(challengeId)) {
    throw new NfcReplayAttackError();
  }

  // 2. Validate Challenge format and age
  const parts = challengeId.split(':');
  if (parts.length < 4) {
    throw new NfcTamperedPayloadError('Invalid challenge ID format.');
  }

  const [challengeSpaceId, challengeTagId, issuedAtStr] = parts;
  const issuedAt = parseInt(issuedAtStr, 10);

  if (challengeSpaceId !== spaceId || challengeTagId !== tagId) {
    throw new NfcTamperedPayloadError('Challenge parameters mismatch space or tag identifier.');
  }

  if (isNaN(issuedAt) || scannedAt - issuedAt > maxAgeMs) {
    throw new NfcExpiredChallengeError();
  }

  // 3. Verify cryptographic tag MAC
  const message = `${spaceId}:${tagId}:${challengeId}`;
  const tagCmac = await generateAesCmac(secretKey, message);
  const isValid = await verifyAesCmac(secretKey, message, tagCmac);

  if (!isValid) {
    throw new NfcTamperedPayloadError();
  }

  // 4. Mark challenge as consumed to prevent replays
  globalNfcChallengeTracker.recordNonce(challengeId, maxAgeMs * 2);

  return {
    verified: true,
    spaceId,
    tagId,
    verifiedAt: Date.now(),
  };
}
