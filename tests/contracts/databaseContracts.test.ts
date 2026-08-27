import { describe, it, expect, beforeEach } from 'vitest';
import {
  DatabaseContractHarness,
  DatabaseRole,
  RLSPolicyViolationError,
  VaultAccessViolationError,
  RpcExecutionError,
} from '@/lib/databaseContracts';

describe('Database Contracts & Security (Scope C)', () => {
  let harness: DatabaseContractHarness;

  beforeEach(() => {
    harness = new DatabaseContractHarness();
    harness.seedUser({
      id: 'user_alice',
      email: 'alice@cozy.test',
      points: 100,
      role: 'authenticated',
    });
    harness.seedUser({
      id: 'user_bob',
      email: 'bob@cozy.test',
      points: 50,
      role: 'authenticated',
    });
    harness.seedPost({
      id: 'post_alice_1',
      user_id: 'user_alice',
      light_img_url: 'https://cdn.cozy.test/light1.jpg',
      dark_img_url: 'https://cdn.cozy.test/dark1.jpg',
      obfuscated_location_hash: '9q8y',
      cheer_count: 0,
      claimed_by_user_id: null,
    });
    harness.seedVaultLocation({
      post_id: 'post_alice_1',
      exact_lat: 37.7749,
      exact_lng: -122.4194,
      postcard_pin: '782910',
    });
  });

  describe('Row-Level Security (RLS) & Role Permission Contracts', () => {
    it('allows "anon" role to read public feed posts but blocks table mutations', async () => {
      const anonClient = harness.createClient({ role: 'anon' });

      const posts = (await anonClient.from('posts').select('*')) as { id: string }[];
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0].id).toBe('post_alice_1');

      await expect(
        anonClient.from('posts').insert({
          id: 'post_anon_hack',
          user_id: 'anon',
          light_img_url: 'hack.jpg',
        })
      ).rejects.toThrow(RLSPolicyViolationError);

      await expect(
        anonClient.from('posts').update({ cheer_count: 999 }).eq('id', 'post_alice_1')
      ).rejects.toThrow(RLSPolicyViolationError);
    });

    it('allows "authenticated" role to insert new posts and update only their own resources', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      // Bob inserts a new post
      const insertRes = (await bobClient.from('posts').insert({
        id: 'post_bob_1',
        user_id: 'user_bob',
        light_img_url: 'bob_light.jpg',
        dark_img_url: 'bob_dark.jpg',
        cheer_count: 0,
      })) as { success: boolean };
      expect(insertRes.success).toBe(true);

      // Bob cannot edit Alice's post
      await expect(
        bobClient.from('posts').update({ light_img_url: 'bob_tamper.jpg' }).eq('id', 'post_alice_1')
      ).rejects.toThrow(RLSPolicyViolationError);

      // Alice can edit her own post
      const aliceClient = harness.createClient({ role: 'authenticated', userId: 'user_alice' });
      const updated = (await aliceClient
        .from('posts')
        .update({ light_img_url: 'alice_updated.jpg' })
        .eq('id', 'post_alice_1')) as { success: boolean };
      expect(updated.success).toBe(true);

      // Querying non-existent post for update throws error
      await expect(
        aliceClient.from('posts').update({ light_img_url: '404.jpg' }).eq('id', 'missing_post_id')
      ).rejects.toThrow(/not found/i);
    });

    it('strictly forbids "anon" and "authenticated" from querying or mutating vault tables directly', async () => {
      const anonClient = harness.createClient({ role: 'anon' });
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      await expect(anonClient.from('post_locations').select('*')).rejects.toThrow(
        VaultAccessViolationError
      );
      await expect(bobClient.from('post_locations').select('*')).rejects.toThrow(
        VaultAccessViolationError
      );

      await expect(
        bobClient.from('post_locations').insert({ post_id: 'p1', exact_lat: 0, exact_lng: 0, postcard_pin: '123' })
      ).rejects.toThrow(VaultAccessViolationError);

      await expect(
        bobClient.from('post_locations').update({ postcard_pin: '000000' }).eq('post_id', 'post_alice_1')
      ).rejects.toThrow(VaultAccessViolationError);
    });

    it('allows service_role client to access and mutate vault tables', async () => {
      const serviceClient = harness.createClient({ role: 'service_role' });

      const vaultData = (await serviceClient
        .from('post_locations')
        .select('*')
        .eq('post_id', 'post_alice_1')) as { postcard_pin: string }[];
      expect(vaultData).toHaveLength(1);
      expect(vaultData[0].postcard_pin).toBe('782910');

      const updateRes = (await serviceClient
        .from('post_locations')
        .update({ postcard_pin: '999999' })
        .eq('post_id', 'post_alice_1')) as { success: boolean };
      expect(updateRes.success).toBe(true);

      // Query users table
      const users = (await serviceClient.from('users').select('*').eq('id', 'user_alice')) as { email: string }[];
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('alice@cozy.test');
    });
  });

  describe('Atomic RPC Stored Procedures Contract Verification', () => {
    it('rejects RPC calls made with anon role', async () => {
      const anonClient = harness.createClient({ role: 'anon' });
      await expect(anonClient.rpc('cheer_post', { p_post_id: 'post_alice_1' })).rejects.toThrow(
        /Authentication required/
      );
    });

    it('executes cheer_post RPC atomically and updates balances and counters', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      const rpcResult = (await bobClient.rpc('cheer_post', {
        p_post_id: 'post_alice_1',
        p_user_id: 'user_bob',
      })) as { personal_points: number; groups_updated: number };

      expect(rpcResult.personal_points).toBe(51);
      expect(rpcResult.groups_updated).toBe(0);

      const post = ((await bobClient.from('posts').select('*').eq('id', 'post_alice_1')) as { cheer_count: number }[])[0];
      expect(post.cheer_count).toBe(1);

      const alice = harness.getUser('user_alice');
      expect(alice?.points).toBe(101);
    });

    it('rejects self-cheering in cheer_post RPC', async () => {
      const aliceClient = harness.createClient({ role: 'authenticated', userId: 'user_alice' });

      await expect(
        aliceClient.rpc('cheer_post', {
          p_post_id: 'post_alice_1',
          p_user_id: 'user_alice',
        })
      ).rejects.toThrow(/cannot cheer your own post/i);
    });

    it('rejects double-cheering via cheer_post RPC (idempotency/uniqueness)', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      await bobClient.rpc('cheer_post', {
        p_post_id: 'post_alice_1',
        p_user_id: 'user_bob',
      });

      await expect(
        bobClient.rpc('cheer_post', {
          p_post_id: 'post_alice_1',
          p_user_id: 'user_bob',
        })
      ).rejects.toThrow(/unique|already cheered/i);
    });

    it('rejects cheer_post when post does not exist', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });
      await expect(
        bobClient.rpc('cheer_post', { p_post_id: 'missing_post_99', p_user_id: 'user_bob' })
      ).rejects.toThrow(/not found/i);
    });

    it('executes record_transaction RPC atomically with ledger logging and rollback on insufficient funds', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      const newPoints = await bobClient.rpc('record_transaction', {
        p_user_id: 'user_bob',
        p_amount: -30,
        p_type: 'sticker_purchase',
        p_description: 'Bought Warm Mug sticker',
      });

      expect(newPoints).toBe(20);
      expect(harness.getUser('user_bob')?.points).toBe(20);

      const ledger = harness.getTransactions('user_bob');
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount).toBe(-30);
      expect(ledger[0].transaction_type).toBe('sticker_purchase');

      await expect(
        bobClient.rpc('record_transaction', {
          p_user_id: 'user_bob',
          p_amount: -50,
          p_type: 'sticker_purchase',
          p_description: 'Expensive item',
        })
      ).rejects.toThrow(/insufficient points/i);

      expect(harness.getUser('user_bob')?.points).toBe(20);
      expect(harness.getTransactions('user_bob')).toHaveLength(1);
    });

    it('throws error when user is not found in record_transaction or unknown RPC is requested', async () => {
      const bobClient = harness.createClient({ role: 'authenticated', userId: 'user_bob' });

      await expect(
        bobClient.rpc('record_transaction', {
          p_user_id: 'non_existent_user',
          p_amount: 10,
        })
      ).rejects.toThrow(/not found/i);

      await expect(
        bobClient.rpc('unsupported_procedure', {})
      ).rejects.toThrow(/Unknown RPC/i);
    });
  });
});
