import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSha256,
  generateAesCmac,
  verifyAesCmac,
  parseDynamicPayload,
  signPayload,
  verifySignedPayload,
  NonceTracker,
} from '@/lib/crypto';
import {
  verifyNfcProofOfPresence,
  generateNfcTagChallenge,
  NfcReplayAttackError,
  NfcTamperedPayloadError,
  NfcExpiredChallengeError,
} from '@/lib/nfcAuth';
import { encodeGeohash } from '@/lib/geohash';
import { calcStickerOpacity, calcReupCost } from '@/lib/stickerMath';
import { getOptimizedImageUrl } from '@/lib/cloudflare';

describe('Cryptographic & Utility Logic (Scope A)', () => {
  const secretKey = '0123456789abcdef0123456789abcdef';

  describe('SHA-256 Hashing', () => {
    it('computes correct SHA-256 hash for known strings', async () => {
      const hashEmpty = await generateSha256('');
      expect(hashEmpty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      const hashCozy = await generateSha256('cozy-clean-home');
      expect(hashCozy).toMatch(/^[a-f0-9]{64}$/);
    });

    it('computes SHA-256 hash for Uint8Array and Buffer inputs', async () => {
      const buffer = Buffer.from('cozy-buffer-input');
      const hashBuffer = await generateSha256(buffer);
      const hashString = await generateSha256('cozy-buffer-input');
      expect(hashBuffer).toBe(hashString);
    });

    it('produces distinct hashes for even slight input variations', async () => {
      const h1 = await generateSha256('post_id_1001');
      const h2 = await generateSha256('post_id_1002');
      expect(h1).not.toBe(h2);
    });
  });

  describe('AES-128 CMAC & Signature Generation', () => {
    it('generates consistent AES-128 CMAC for message and key', async () => {
      const msg = 'tag_serial_04A1B2C3D4E5F6';
      const mac1 = await generateAesCmac(secretKey, msg);
      const mac2 = await generateAesCmac(secretKey, msg);
      expect(mac1).toBe(mac2);
      expect(mac1).toHaveLength(32);
    });

    it('throws error when key length is not 16 bytes (32 hex characters)', async () => {
      await expect(generateAesCmac('invalid_key_length', 'msg')).rejects.toThrow(/16-byte/);
    });

    it('verifies valid CMAC and rejects tampered payload or invalid key', async () => {
      const msg = 'user_presence_verification_payload';
      const mac = await generateAesCmac(secretKey, msg);

      const isValid = await verifyAesCmac(secretKey, msg, mac);
      expect(isValid).toBe(true);

      const isTamperedValid = await verifyAesCmac(secretKey, 'user_presence_tampered_payload', mac);
      expect(isTamperedValid).toBe(false);

      const wrongKey = 'fedcba9876543210fedcba9876543210';
      const isWrongKeyValid = await verifyAesCmac(wrongKey, msg, mac);
      expect(isWrongKeyValid).toBe(false);

      const isMalformedValid = await verifyAesCmac(secretKey, msg, 'invalid_hex');
      expect(isMalformedValid).toBe(false);
    });
  });

  describe('NonceTracker Engine', () => {
    it('purges expired nonces and clears state', () => {
      const tracker = new NonceTracker();
      tracker.recordNonce('nonce-old', -1000);
      tracker.recordNonce('nonce-fresh', 50000);

      expect(tracker.isConsumed('nonce-old')).toBe(true);
      tracker.purgeExpired();
      expect(tracker.isConsumed('nonce-old')).toBe(false);
      expect(tracker.isConsumed('nonce-fresh')).toBe(true);

      tracker.clear();
      expect(tracker.isConsumed('nonce-fresh')).toBe(false);
    });
  });

  describe('Dynamic Payload Parsing & Schema Validation', () => {
    it('correctly parses and validates valid dynamic payload JSON', () => {
      const rawJson = JSON.stringify({
        tagId: 'NFC-COZY-77',
        spaceId: 'space-99',
        timestamp: Date.now(),
        nonce: 'rand-nonce-1234',
        metadata: { room: 'Living Room', lighting: 'ambient' },
      });

      const parsed = parseDynamicPayload(rawJson);
      expect(parsed).toEqual({
        tagId: 'NFC-COZY-77',
        spaceId: 'space-99',
        timestamp: expect.any(Number),
        nonce: 'rand-nonce-1234',
        metadata: { room: 'Living Room', lighting: 'ambient' },
      });
    });

    it('throws descriptive error on malformed or missing fields', () => {
      expect(() => parseDynamicPayload('not-json')).toThrow(/Invalid JSON/);
      expect(() => parseDynamicPayload('null')).toThrow(/Invalid payload: expected an object/);
      expect(() => parseDynamicPayload(JSON.stringify({ spaceId: 'only-space' }))).toThrow(
        /Missing required payload fields/
      );
    });
  });

  describe('Signed Payload, Tampering Detection & Replay Attack Prevention', () => {
    let nonceTracker: NonceTracker;

    beforeEach(() => {
      nonceTracker = new NonceTracker();
    });

    it('signs and verifies authentic payloads within TTL window', async () => {
      const payload = {
        spaceId: 'house-plot-42',
        claimedBy: 'user-xyz',
        timestamp: Date.now(),
        nonce: 'nonce-112233',
      };

      const signed = await signPayload(payload, secretKey);
      expect(signed.signature).toBeDefined();

      const verification = await verifySignedPayload(signed, secretKey, {
        maxAgeMs: 5000,
        nonceTracker,
      });

      expect(verification.valid).toBe(true);
      expect(verification.payload.spaceId).toBe('house-plot-42');
    });

    it('detects payload tampering and rejects verification', async () => {
      const payload = {
        spaceId: 'house-plot-42',
        claimedBy: 'user-xyz',
        timestamp: Date.now(),
        nonce: 'nonce-tamper-1',
      };

      const signed = await signPayload(payload, secretKey);
      signed.payload.claimedBy = 'attacker-user';

      const verification = await verifySignedPayload(signed, secretKey, {
        maxAgeMs: 5000,
        nonceTracker,
      });

      expect(verification.valid).toBe(false);
      expect(verification.reason).toMatch(/Signature mismatch|tamper/i);
    });

    it('prevents replay attacks by rejecting reused nonces', async () => {
      const payload = {
        spaceId: 'house-plot-42',
        claimedBy: 'user-xyz',
        timestamp: Date.now(),
        nonce: 'replayed-nonce-55',
      };

      const signed = await signPayload(payload, secretKey);

      const first = await verifySignedPayload(signed, secretKey, {
        maxAgeMs: 10000,
        nonceTracker,
      });
      expect(first.valid).toBe(true);

      const second = await verifySignedPayload(signed, secretKey, {
        maxAgeMs: 10000,
        nonceTracker,
      });
      expect(second.valid).toBe(false);
      expect(second.reason).toMatch(/Replay attack detected: Nonce already consumed/i);
    });

    it('rejects expired payloads beyond maxAgeMs', async () => {
      const payload = {
        spaceId: 'house-plot-42',
        claimedBy: 'user-xyz',
        timestamp: Date.now() - 10000,
        nonce: 'old-nonce-99',
      };

      const signed = await signPayload(payload, secretKey);

      const verification = await verifySignedPayload(signed, secretKey, {
        maxAgeMs: 3000,
        nonceTracker,
      });

      expect(verification.valid).toBe(false);
      expect(verification.reason).toMatch(/Payload expired/i);
    });

    it('verifies signed payload without optional options', async () => {
      const payload = { spaceId: 'plot-1' };
      const signed = await signPayload(payload, secretKey);
      const verification = await verifySignedPayload(signed, secretKey);
      expect(verification.valid).toBe(true);
    });
  });

  describe('NFC Proof of Presence (lib/nfcAuth.ts)', () => {
    it('generates cryptographic NFC challenges and validates successful scan', async () => {
      const challenge = generateNfcTagChallenge('house-space-123', 'tag-nfc-001');
      expect(challenge.challengeId).toBeDefined();
      expect(challenge.tagId).toBe('tag-nfc-001');

      const presence = await verifyNfcProofOfPresence({
        tagId: 'tag-nfc-001',
        spaceId: 'house-space-123',
        challengeId: challenge.challengeId,
        scannedAt: Date.now(),
        secretKey,
      });

      expect(presence.verified).toBe(true);
      expect(presence.verifiedAt).toBeGreaterThan(0);
    });

    it('throws NfcTamperedPayloadError on malformed challenge format or mismatch', async () => {
      await expect(
        verifyNfcProofOfPresence({
          tagId: 'tag-counterfeit',
          spaceId: 'house-space-123',
          challengeId: 'malformed_challenge',
          scannedAt: Date.now(),
          secretKey,
        })
      ).rejects.toThrow(NfcTamperedPayloadError);

      await expect(
        verifyNfcProofOfPresence({
          tagId: 'tag-different',
          spaceId: 'house-space-123',
          challengeId: 'house-space-123:tag-expected:1700000000000:rand',
          scannedAt: Date.now(),
          secretKey,
        })
      ).rejects.toThrow(NfcTamperedPayloadError);
    });

    it('throws NfcExpiredChallengeError when scan exceeds maxAgeMs', async () => {
      const oldTime = Date.now() - 50000;
      const challengeId = `house-space-123:tag-nfc-001:${oldTime}:randomnonce`;

      await expect(
        verifyNfcProofOfPresence({
          tagId: 'tag-nfc-001',
          spaceId: 'house-space-123',
          challengeId,
          scannedAt: Date.now(),
          secretKey,
          maxAgeMs: 5000,
        })
      ).rejects.toThrow(NfcExpiredChallengeError);
    });

    it('throws NfcReplayAttackError when the same challenge is reused', async () => {
      const challenge = generateNfcTagChallenge('house-space-123', 'tag-nfc-replayed');

      await verifyNfcProofOfPresence({
        tagId: 'tag-nfc-replayed',
        spaceId: 'house-space-123',
        challengeId: challenge.challengeId,
        scannedAt: Date.now(),
        secretKey,
      });

      await expect(
        verifyNfcProofOfPresence({
          tagId: 'tag-nfc-replayed',
          spaceId: 'house-space-123',
          challengeId: challenge.challengeId,
          scannedAt: Date.now(),
          secretKey,
        })
      ).rejects.toThrow(NfcReplayAttackError);
    });
  });

  describe('Existing Utility Logic Verifications', () => {
    it('computes accurate precision-4 geohashes', () => {
      const sfHash = encodeGeohash(37.7749, -122.4194, 4);
      expect(sfHash).toHaveLength(4);
      expect(sfHash).toBe('9q8y');

      const londonHash = encodeGeohash(51.5074, -0.1278, 4);
      expect(londonHash).toHaveLength(4);
      expect(londonHash).toBe('gcpv');
    });

    it('calculates sticker decay opacity with 0.20 ghost floor', () => {
      const now = new Date().toISOString();
      const freshOpacity = calcStickerOpacity(now, 0.05);
      expect(freshOpacity).toBeCloseTo(1.0, 2);

      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const decayedOpacity = calcStickerOpacity(tenDaysAgo, 0.05);
      expect(decayedOpacity).toBeCloseTo(0.5, 2);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ghostOpacity = calcStickerOpacity(thirtyDaysAgo, 0.05);
      expect(ghostOpacity).toBe(0.2);
    });

    it('calculates sticker reup discounted cost accurately', () => {
      expect(calcReupCost(100, 0.5)).toBe(50);
      expect(calcReupCost(100, 1.0)).toBe(100);
      expect(calcReupCost(1, 0.01)).toBe(1);
    });

    it('formats Cloudflare optimized image URLs correctly', () => {
      const r2Url = 'https://assets.cozy.zone/cozy/user1/image.jpg';
      const optimized = getOptimizedImageUrl(r2Url, 800, { height: 600, quality: 90 });
      expect(optimized).toContain('/cdn-cgi/image/');
      expect(optimized).toContain('width=800');
      expect(optimized).toContain('height=600');
      expect(optimized).toContain('quality=90');

      expect(getOptimizedImageUrl('')).toBe('');
      expect(getOptimizedImageUrl('/uploads/pic.jpg', 800)).toBe('/uploads/pic.jpg');
      expect(getOptimizedImageUrl('data:image/png;base64,...', 800)).toBe('data:image/png;base64,...');
      expect(getOptimizedImageUrl('blob:http://localhost/123', 800)).toBe('blob:http://localhost/123');
      expect(getOptimizedImageUrl('http://localhost:3000/pic.jpg', 800)).toBe('http://localhost:3000/pic.jpg');
      expect(getOptimizedImageUrl('http://127.0.0.1:3000/pic.jpg', 800)).toBe('http://127.0.0.1:3000/pic.jpg');
      expect(getOptimizedImageUrl('https://assets.cozy.zone/pic.jpg')).toBe('https://assets.cozy.zone/pic.jpg');
      expect(getOptimizedImageUrl('not-a-valid-url-format', 800)).toBe('not-a-valid-url-format');
    });
  });
});
