'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Key,
  X,
  Users,
  TrendingUp,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { createGroup, joinGroup } from '@/app/actions/groupActions';
import type { MyGroupEntry } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { useModalBackButton } from '@/hooks/useModalBackButton';

const GROUP_TYPES = Object.entries(GROUP_TYPE_META).filter(
  ([type]) => ['household', 'building', 'neighborhood', 'village', 'town', 'city', 'island', 'space_station'].includes(type)
);

// ---------------------------------------------------------------------------
// Create Group Modal
// ---------------------------------------------------------------------------

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  useModalBackButton({ isOpen: true, onClose });
  const [name, setName] = useState('');
  const [type, setType] = useState('household');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate() {
    if (!name.trim()) { setError('Please give your group a name.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await createGroup(name, type);
      if (!result.success) { setError(result.error ?? 'Creation failed.'); return; }
      router.push(`/groups/${result.groupId}`);
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl p-6 space-y-5 cozy-glass cozy-shadow-lg border border-[--cozy-amber]/30"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-800 text-[--cozy-bark]">Create a Group</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-600 text-[--cozy-muted] mb-1.5">Group name</label>
            <input
              type="text"
              placeholder="e.g. The Sunshade Collective"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-500 outline-none bg-black/5 border border-black/10 text-[--cozy-night] placeholder:text-[--cozy-muted]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-600 text-[--cozy-muted] mb-1.5">Group type</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {GROUP_TYPES.map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-600 text-left transition-all"
                  style={{
                    background: type === key
                      ? (meta.palette === 'futuristic' ? 'rgba(0,220,255,0.12)' : 'rgba(240,192,96,0.18)')
                      : 'rgba(0,0,0,0.04)',
                    border: type === key
                      ? (meta.palette === 'futuristic' ? '1px solid rgba(0,220,255,0.40)' : '1px solid rgba(240,192,96,0.50)')
                      : '1px solid rgba(0,0,0,0.08)',
                    color: type === key ? 'var(--cozy-rust)' : 'var(--cozy-muted)',
                  }}
                >
                  <span className="text-base">{meta.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate">{meta.label}</p>
                    <p className="text-[10px] opacity-60">≤ {meta.capacity}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 font-500">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={isPending}
          className="w-full py-3 rounded-2xl text-sm font-800 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(196,112,74,0.30)',
          }}
        >
          <Plus size={16} />
          {isPending ? 'Creating…' : 'Create Group'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Join Group Modal
// ---------------------------------------------------------------------------

function JoinGroupModal({ onClose }: { onClose: () => void }) {
  useModalBackButton({ isOpen: true, onClose });
  const [code, setCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleJoin() {
    if (!code.trim()) { setError('Enter an invite code.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await joinGroup(code);
      if (!result.success) { setError(result.error ?? 'Join failed.'); return; }
      router.push(`/groups/${result.groupId}`);
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5 cozy-glass cozy-shadow-lg border border-[--cozy-amber]/30"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-800 text-[--cozy-bark]">Join via Invite Code</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[--cozy-muted]">
          Ask your group admin for the 8-character invite code.
        </p>

        <input
          type="text"
          placeholder="e.g. a3f7b2c1"
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase())}
          maxLength={8}
          className="w-full rounded-xl px-4 py-3 text-center text-lg font-800 tracking-widest outline-none bg-black/5 border border-black/10 text-[--cozy-night] placeholder:text-[--cozy-muted]/40 placeholder:tracking-normal"
        />

        {error && <p className="text-xs text-rose-500 font-500">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={isPending || code.length < 8}
          className="w-full py-3 rounded-2xl text-sm font-800 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(196,112,74,0.30)',
          }}
        >
          <Key size={16} />
          {isPending ? 'Joining…' : 'Join Group'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Group Card
// ---------------------------------------------------------------------------

function GroupCard({ entry }: { entry: MyGroupEntry }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const meta = GROUP_TYPE_META[entry.group.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';
  const progress = (entry.group.pooled_points / 100) * 100; // progress to first tier

  function copyCode() {
    navigator.clipboard.writeText(entry.group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      className="relative rounded-3xl p-4 overflow-hidden cursor-pointer group"
      style={{
        background: isFuturistic
          ? 'linear-gradient(135deg, rgba(8,15,30,0.90), rgba(10,20,50,0.92))'
          : 'rgba(250,247,242,0.80)',
        border: isFuturistic ? '1px solid rgba(0,220,255,0.18)' : '1px solid rgba(232,168,124,0.30)',
        backdropFilter: 'blur(16px)',
        boxShadow: isFuturistic
          ? '0 0 24px rgba(0,220,255,0.07), 0 8px 32px rgba(0,0,0,0.40)'
          : '0 4px 16px rgba(122,79,58,0.10)',
      }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/groups/${entry.group.id}`)}
    >
      {/* Background glow for futuristic */}
      {isFuturistic && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-3xl"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(0,220,255,0.08), transparent 70%)' }}
        />
      )}

      <div className="flex items-start gap-3 relative z-10">
        {/* Type emoji badge */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: isFuturistic ? 'rgba(0,220,255,0.10)' : 'rgba(240,192,96,0.15)',
            border: isFuturistic ? '1px solid rgba(0,220,255,0.25)' : '1px solid rgba(240,192,96,0.35)',
          }}
        >
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-sm font-800 truncate"
              style={{ color: isFuturistic ? '#e0f4ff' : '#1a1410' }}
            >
              {entry.group.name}
            </h3>
            {entry.role === 'admin' && (
              <span
                className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                style={{
                  background: isFuturistic ? 'rgba(168,85,247,0.18)' : 'rgba(240,192,96,0.20)',
                  color: isFuturistic ? '#c084fc' : '#c4704a',
                  border: isFuturistic ? '1px solid rgba(168,85,247,0.30)' : '1px solid rgba(240,192,96,0.40)',
                }}
              >
                Admin
              </span>
            )}
          </div>
          <p className="text-xs font-500 mt-0.5" style={{ color: isFuturistic ? '#60a0bc' : '#8a7060' }}>
            {meta.label} · {entry.memberCount} / {entry.group.max_members} members
          </p>

          {/* Pooled points mini progress */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: isFuturistic
                    ? 'linear-gradient(90deg, #00dcff, #a855f7)'
                    : 'linear-gradient(90deg, #f0c060, #e8a87c)',
                }}
              />
            </div>
            <span className="text-[10px] font-600 flex items-center gap-0.5" style={{ color: isFuturistic ? '#00dcff' : '#c4704a' }}>
              <TrendingUp size={10} />
              {entry.group.pooled_points} pts
            </span>
          </div>
        </div>

        <ChevronRight size={16} style={{ color: isFuturistic ? '#60a0bc' : '#8a7060', flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Invite code row */}
      <div
        className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl relative z-10"
        style={{
          background: isFuturistic ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: isFuturistic ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-700 tracking-widest" style={{ color: isFuturistic ? '#60a0bc' : '#8a7060' }}>
          {entry.group.invite_code}
        </span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1 text-[10px] font-700 transition-all hover:scale-110"
          style={{ color: isFuturistic ? '#00dcff' : '#c4704a' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GroupsHubClient — main export (client shell for Hub page)
// ---------------------------------------------------------------------------

interface GroupsHubClientProps {
  initialGroups: MyGroupEntry[];
}

export function GroupsHubClient({ initialGroups }: GroupsHubClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-2">
        <motion.button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-800 transition-all"
          style={{
            background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(196,112,74,0.28)',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Plus size={15} />
          New Group
        </motion.button>

        <motion.button
          onClick={() => setShowJoin(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-800 transition-all border border-[--cozy-amber]/40 text-[--cozy-rust] bg-white/60 backdrop-blur-md"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Key size={15} />
          Join
        </motion.button>
      </div>

      {/* Group cards */}
      {initialGroups.length === 0 ? (
        <motion.div
          className="text-center py-16 px-8 rounded-3xl cozy-glass border border-[--cozy-amber]/20 space-y-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-4xl">🏘️</p>
          <p className="text-base font-700 text-[--cozy-bark]">No groups yet</p>
          <p className="text-sm text-[--cozy-muted] max-w-xs mx-auto">
            Create your first group or join one with an invite code to start pooling points with your people.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-800 transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
              color: '#fff',
            }}
          >
            <Plus size={14} />
            Create a Group
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {initialGroups.map((entry, i) => (
            <motion.div
              key={entry.group.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.34, 1.4, 0.64, 1] }}
            >
              <GroupCard entry={entry} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
      </AnimatePresence>
    </>
  );
}
