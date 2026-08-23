/**
 * Cozy PWA — Staging Web of Test Users Seed Script
 *
 * Creates an interconnected network of realistic test users with:
 * - Supabase Auth accounts (password: CozyTest123!)
 * - Cozy profiles (points, vibe status, expansion tiers, avatars)
 * - Multi-member groups (Household, Village, Space Station with pooled points & roles)
 * - Calling card peer connections (both accepted mutuals & pending inbox cards)
 * - Sample light/dark aesthetic posts with cross-user cheers
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-staging-web.js
 *   or: npm run seed:staging
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables if not already set in process.env
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('Please ensure they are defined in .env.local or your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Standard test password for all generated users
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD || 'CozyTest123!';

// Test Users Definition
const TEST_USERS = [
  {
    key: 'willow',
    email: 'willow@cozy.test',
    displayName: 'Willow Craft 🌿',
    vibeStatus: 'sunshine',
    points: 340,
    expansionTier: 2,
    milestoneTokens: 40,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Cottagecore lover & herbal tea collector.',
  },
  {
    key: 'oliver',
    email: 'oliver@cozy.test',
    displayName: 'Oliver Moss 🍵',
    vibeStatus: 'neutral',
    points: 620,
    expansionTier: 3,
    milestoneTokens: 120,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Plant parent, woodworking hobbyist, and community builder.',
  },
  {
    key: 'maya',
    email: 'maya@cozy.test',
    displayName: 'Maya Books 📚',
    vibeStatus: 'sunshine',
    points: 180,
    expansionTier: 1,
    milestoneTokens: 10,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'Reading nooks and fairy light curator.',
  },
  {
    key: 'leo',
    email: 'leo@cozy.test',
    displayName: 'Leo Amber 🕯️',
    vibeStatus: 'raincloud',
    points: 410,
    expansionTier: 2,
    milestoneTokens: 60,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Warm ambient lighting & vintage desk arrangements.',
  },
  {
    key: 'sam',
    email: 'sam@cozy.test',
    displayName: 'Sam Whiskers 🐱',
    vibeStatus: 'sunshine',
    points: 150,
    expansionTier: 1,
    milestoneTokens: 20,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Minimalist loft & cat sanctuary.',
  },
  {
    key: 'chloe',
    email: 'chloe@cozy.test',
    displayName: 'Chloe Fern 🪴',
    vibeStatus: 'neutral',
    points: 530,
    expansionTier: 2,
    milestoneTokens: 90,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bio: 'Balcony botanical gardens and morning coffee.',
  },
];

// Sample Posts (with curated aesthetic Unsplash day & night pairs)
const SAMPLE_POSTS = [
  {
    authorKey: 'willow',
    lightImg: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
    darkImg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80',
    locationHash: 'dr5r',
    cheersFrom: ['oliver', 'maya', 'sam'],
  },
  {
    authorKey: 'oliver',
    lightImg: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&auto=format&fit=crop&q=80',
    darkImg: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000&auto=format&fit=crop&q=80',
    locationHash: 'dr5r',
    cheersFrom: ['willow', 'leo', 'chloe', 'maya'],
  },
  {
    authorKey: 'leo',
    lightImg: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&auto=format&fit=crop&q=80',
    darkImg: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1000&auto=format&fit=crop&q=80',
    locationHash: '9q8y',
    cheersFrom: ['oliver', 'willow', 'chloe'],
  },
];

async function seed() {
  console.log('\n========================================================');
  console.log('🏡  COZY PWA — STAGING WEB SEEDER');
  console.log('========================================================\n');
  console.log(`Connecting to Supabase at: ${SUPABASE_URL}\n`);

  const userMap = new Map(); // key -> { id, email, displayName, ... }

  // -------------------------------------------------------------------------
  // 1. Create or retrieve auth users
  // -------------------------------------------------------------------------
  console.log('👥 1. Setting up test users in Auth and cozy.users...');

  for (const u of TEST_USERS) {
    let userId = null;

    // Check if auth user already exists by listing/fetching
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (listError) {
      console.error(`⚠️ Error listing users:`, listError.message);
    }

    const existingAuthUser = userList?.users?.find((x) => x.email === u.email);

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      console.log(`  ✓ Found existing auth user: ${u.email} (${userId})`);
    } else {
      // Create new user in auth.users
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: u.displayName,
          avatar_url: u.avatarUrl,
        },
      });

      if (createError) {
        console.error(`  ❌ Failed to create auth user ${u.email}:`, createError.message);
        continue;
      }

      userId = created.user.id;
      console.log(`  + Created auth user: ${u.email} (${userId})`);
    }

    // Ensure auth user metadata is up to date
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        display_name: u.displayName,
        avatar_url: u.avatarUrl,
      },
    });

    // Upsert into cozy.users with test profile attributes
    const { error: profileError } = await supabase
      .schema('cozy')
      .from('users')
      .upsert({
        id: userId,
        display_name: u.displayName,
        points: u.points,
        vibe_status: u.vibeStatus,
        expansion_tier: u.expansionTier,
        milestone_tokens: u.milestoneTokens,
        themes_unlocked: true,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error(`  ❌ Failed to update cozy.users for ${u.email}:`, profileError.message);
    } else {
      console.log(`  ✓ Updated cozy profile: ${u.displayName} (${u.points} pts, ${u.vibeStatus})`);
    }

    userMap.set(u.key, { ...u, id: userId });
  }

  // -------------------------------------------------------------------------
  // 2. Create Groups & Memberships
  // -------------------------------------------------------------------------
  console.log('\n🏘️ 2. Setting up community groups and memberships...');

  const GROUPS_DATA = [
    {
      name: 'Mossy Hearth Collective',
      type: 'village',
      themeId: 'default_dollhouse',
      pooledPoints: 480,
      admin: 'oliver',
      members: ['willow', 'maya', 'leo'],
    },
    {
      name: 'Midnight Tea Society',
      type: 'household',
      themeId: 'default_dollhouse',
      pooledPoints: 160,
      admin: 'willow',
      members: ['sam', 'chloe'],
    },
    {
      name: 'Nebula Loft Hub',
      type: 'space_station',
      themeId: 'space_station',
      pooledPoints: 920,
      admin: 'leo',
      members: ['chloe', 'oliver', 'maya'],
    },
  ];

  const groupMap = new Map();

  for (const g of GROUPS_DATA) {
    const adminUser = userMap.get(g.admin);
    if (!adminUser) continue;

    // Check if group already exists
    const { data: existingGroups } = await supabase
      .schema('cozy')
      .from('groups')
      .select('id, name')
      .eq('name', g.name);

    let groupId = existingGroups && existingGroups.length > 0 ? existingGroups[0].id : null;

    if (!groupId) {
      const { data: newGroup, error: groupCreateError } = await supabase
        .schema('cozy')
        .from('groups')
        .insert({
          name: g.name,
          type: g.type,
          theme_id: g.themeId,
          pooled_points: g.pooledPoints,
          max_members: g.type === 'household' ? 10 : g.type === 'village' ? 24 : 48,
        })
        .select('id')
        .single();

      if (groupCreateError || !newGroup) {
        console.error(`  ❌ Failed to create group "${g.name}":`, groupCreateError?.message);
        continue;
      }
      groupId = newGroup.id;
      console.log(`  + Created group: "${g.name}" [${g.type}] (${groupId})`);
    } else {
      console.log(`  ✓ Found existing group: "${g.name}" (${groupId})`);
      // Update pooled points
      await supabase
        .schema('cozy')
        .from('groups')
        .update({ pooled_points: g.pooledPoints })
        .eq('id', groupId);
    }

    groupMap.set(g.name, groupId);

    // Upsert Admin Membership
    await supabase
      .schema('cozy')
      .from('group_members')
      .upsert({
        group_id: groupId,
        user_id: adminUser.id,
        role: 'admin',
      });

    // Upsert Member Memberships
    for (const memKey of g.members) {
      const memUser = userMap.get(memKey);
      if (!memUser) continue;

      await supabase
        .schema('cozy')
        .from('group_members')
        .upsert({
          group_id: groupId,
          user_id: memUser.id,
          role: 'member',
        });
    }

    console.log(`    ↳ Added admin @${g.admin} + ${g.members.length} members.`);
  }

  // -------------------------------------------------------------------------
  // 3. Create Peer Connections (Calling Cards)
  // -------------------------------------------------------------------------
  console.log('\n💌 3. Setting up Calling Cards & Peer Connections...');

  const PEER_PAIRS = [
    { from: 'willow', to: 'oliver', status: 'accepted' },
    { from: 'willow', to: 'maya', status: 'accepted' },
    { from: 'oliver', to: 'leo', status: 'accepted' },
    { from: 'sam', to: 'chloe', status: 'accepted' },
    // Pending cards waiting in inbox:
    { from: 'sam', to: 'willow', status: 'pending' },
    { from: 'chloe', to: 'oliver', status: 'pending' },
    { from: 'leo', to: 'maya', status: 'pending' },
  ];

  for (const pair of PEER_PAIRS) {
    const fromUser = userMap.get(pair.from);
    const toUser = userMap.get(pair.to);
    if (!fromUser || !toUser) continue;

    // Check if peer row exists (bidirectionally)
    const { data: existingPeers } = await supabase
      .schema('cozy')
      .from('peers')
      .select('id, status')
      .or(`and(requester_id.eq.${fromUser.id},recipient_id.eq.${toUser.id}),and(requester_id.eq.${toUser.id},recipient_id.eq.${fromUser.id})`);

    if (existingPeers && existingPeers.length > 0) {
      await supabase
        .schema('cozy')
        .from('peers')
        .update({ status: pair.status })
        .eq('id', existingPeers[0].id);
      console.log(`  ✓ Updated peer connection: ${pair.from} <-> ${pair.to} (${pair.status})`);
    } else {
      const { error: peerInsertError } = await supabase
        .schema('cozy')
        .from('peers')
        .insert({
          requester_id: fromUser.id,
          recipient_id: toUser.id,
          status: pair.status,
        });

      if (!peerInsertError) {
        console.log(`  + Created peer connection: ${pair.from} -> ${pair.to} (${pair.status})`);
      } else {
        console.warn(`  ⚠️ Peer insert note:`, peerInsertError.message);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Create Sample Posts & Cheers
  // -------------------------------------------------------------------------
  console.log('\n📸 4. Setting up aesthetic posts and cheers...');

  for (const p of SAMPLE_POSTS) {
    const author = userMap.get(p.authorKey);
    if (!author) continue;

    // Check if post already exists for this user with same light_img_url
    const { data: existingPost } = await supabase
      .schema('cozy')
      .from('posts')
      .select('id')
      .eq('user_id', author.id)
      .eq('light_img_url', p.lightImg);

    let postId = existingPost && existingPost.length > 0 ? existingPost[0].id : null;

    if (!postId) {
      const { data: newPost, error: postErr } = await supabase
        .schema('cozy')
        .from('posts')
        .insert({
          user_id: author.id,
          light_img_url: p.lightImg,
          dark_img_url: p.darkImg,
          obfuscated_location_hash: p.locationHash,
          cheer_count: p.cheersFrom.length,
        })
        .select('id')
        .single();

      if (postErr || !newPost) {
        console.error(`  ❌ Failed to create post for ${p.authorKey}:`, postErr?.message);
        continue;
      }
      postId = newPost.id;
      console.log(`  + Created post for @${p.authorKey} (${postId})`);
    } else {
      console.log(`  ✓ Post already exists for @${p.authorKey}`);
    }

    // Insert cheers
    for (const cheerKey of p.cheersFrom) {
      const cheeringUser = userMap.get(cheerKey);
      if (!cheeringUser || cheeringUser.id === author.id) continue;

      await supabase
        .schema('cozy')
        .from('cheers')
        .upsert({
          post_id: postId,
          user_id: cheeringUser.id,
        });
    }
  }

  // -------------------------------------------------------------------------
  // 5. Output Test Credentials Summary Table
  // -------------------------------------------------------------------------
  console.log('\n========================================================');
  console.log('🎉  STAGING TEST USERS WEB READY!');
  console.log('========================================================\n');
  console.log(`🔑 All Accounts Password:  ${DEFAULT_PASSWORD}\n`);

  console.log('📋 Test User Accounts:');
  console.log('---------------------------------------------------------------------------------------------------');
  console.log('| Email                 | Display Name         | Vibe       | Tier | Tokens | Points |');
  console.log('---------------------------------------------------------------------------------------------------');
  for (const u of TEST_USERS) {
    const emailCol = u.email.padEnd(21);
    const nameCol = u.displayName.padEnd(20);
    const vibeCol = u.vibeStatus.padEnd(10);
    const tierCol = `Tier ${u.expansionTier}`.padEnd(6);
    const tokenCol = String(u.milestoneTokens).padEnd(6);
    const ptsCol = String(u.points).padEnd(6);
    console.log(`| ${emailCol} | ${nameCol} | ${vibeCol} | ${tierCol} | ${tokenCol} | ${ptsCol} |`);
  }
  console.log('---------------------------------------------------------------------------------------------------\n');

  console.log('🏘️ Groups Created:');
  for (const [name, gid] of groupMap.entries()) {
    console.log(`  • ${name} (ID: ${gid})`);
  }
  console.log('\n');
}

seed()
  .then(() => {
    console.log('✨ Seed script completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error during seeding:', err);
    process.exit(1);
  });
