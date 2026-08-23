'use client';

import React, { useState, useTransition, useOptimistic } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Home, X, Check, ArrowRight, LayoutGrid,
  Lock, Maximize2, Minimize2, Coins,
} from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import {
  SHELL_DEFINITIONS,
  getShellDefinition,
  getActiveSlots,
  getLockedSlots,
  getAvailableShells,
  isSlotInShell,
  TIER_UNLOCK_COSTS,
  TIER_NAMES,
  TIER_BADGES,
  type ShellSlot,
} from '@/config/shellDefinitions';
import { ShellNook } from './ShellNook';
import { TierUnlockOverlay } from './TierUnlockOverlay';
import {
  updateUserShell,
  assignPostToSlot,
  removePostFromSlot,
  redeemExpansionToken,
} from '@/app/actions/shellActions';
import type { UserPost } from '@/store/useCozyStore';
import { useCozyStore } from '@/store/useCozyStore';
import { DollhouseMailbox } from './DollhouseMailbox';
import type { PeerStatus, PendingCard } from '@/app/actions/peerActions';

interface ProfileShellProps {
  initialShellType: string;
  initialExpansionTier: number;
  initialMilestoneTokens: number;
  themesUnlocked: boolean;
  posts: UserPost[];
  isOwner: boolean;
  onPostSelect?: (post: UserPost) => void;
  /** Peer relationship from the viewer's perspective. */
  peerStatus?: PeerStatus;
  /** Pending Calling Cards in the owner's inbox (owner view only). */
  pendingCards?: PendingCard[];
  /** Profile owner's ID — used by the mailbox to send a card. */
  recipientId?: string;
  /** Authenticated user's ID — null when logged out. */
  currentUserId?: string | null;
}

export function ProfileShell({
  initialShellType,
  initialExpansionTier,
  initialMilestoneTokens,
  themesUnlocked,
  posts: initialPosts,
  isOwner,
  onPostSelect,
  peerStatus = 'none',
  pendingCards = [],
  recipientId = '',
  currentUserId = null,
}: ProfileShellProps) {
  const pathname = usePathname();
  const { setExpansionTier, setMilestoneTokens } = useCozyStore();

  const [shellType, setShellType] = useState(initialShellType);
  const [expansionTier, setLocalExpansionTier] = useState(initialExpansionTier);
  const [milestoneTokens, setLocalMilestoneTokens] = useState(initialMilestoneTokens);
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<ShellSlot | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unlockedTier, setUnlockedTier] = useState<number | null>(null); // celebration trigger

  // Optimistic state for posts assignment
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(
    initialPosts,
    (state, action:
      | { type: 'ASSIGN'; postId: string; slotId: string }
      | { type: 'UNASSIGN'; postId: string }
      | { type: 'SWITCH_THEME'; validSlotIds: string[] }
    ) => {
      if (action.type === 'ASSIGN') {
        return state.map((p) => {
          if (p.shell_slot === action.slotId) return { ...p, shell_slot: null };
          if (p.id === action.postId) return { ...p, shell_slot: action.slotId };
          return p;
        });
      }
      if (action.type === 'UNASSIGN') {
        return state.map((p) => (p.id === action.postId ? { ...p, shell_slot: null } : p));
      }
      if (action.type === 'SWITCH_THEME') {
        return state.map((p) => {
          if (p.shell_slot && !action.validSlotIds.includes(p.shell_slot)) {
            return { ...p, shell_slot: null };
          }
          return p;
        });
      }
      return state;
    }
  );

  const currentShell = getShellDefinition(shellType);
  const activeSlots = getActiveSlots(currentShell, expansionTier);
  const lockedSlots = getLockedSlots(currentShell, expansionTier);
  const availableShells = getAvailableShells(themesUnlocked);

  const unassignedPosts = optimisticPosts.filter(
    (p) => !p.shell_slot || !isSlotInShell(p.shell_slot, currentShell)
  );

  const slottedPostMap = new Map<string, UserPost>();
  optimisticPosts.forEach((p) => {
    if (p.shell_slot && isSlotInShell(p.shell_slot, currentShell)) {
      slottedPostMap.set(p.shell_slot, p);
    }
  });

  // The focused slot is always the first active slot (tier-1 corner)
  const focusedSlot = activeSlots[0];

  // Next unlock info
  const nextTier = expansionTier < 3 ? expansionTier + 1 : null;
  const nextTierCost = nextTier ? TIER_UNLOCK_COSTS[nextTier] : null;
  const canUnlock = nextTier !== null && milestoneTokens >= (nextTierCost ?? Infinity);

  // Handle Shell Type Switch
  const handleSelectShellType = (newType: string) => {
    setIsThemeMenuOpen(false);
    setShellType(newType);
    const targetDef = getShellDefinition(newType);
    const validSlotIds = targetDef.slots.map((s) => s.id);

    startTransition(async () => {
      setOptimisticPosts({ type: 'SWITCH_THEME', validSlotIds });
      await updateUserShell(newType, pathname);
    });
  };

  // Handle Slot Assignment
  const handleAssignPost = (postId: string) => {
    if (!selectedSlotForAssignment) return;
    const slotId = selectedSlotForAssignment.id;
    setSelectedSlotForAssignment(null);

    startTransition(async () => {
      setOptimisticPosts({ type: 'ASSIGN', postId, slotId });
      await assignPostToSlot(postId, slotId, pathname);
    });
  };

  // Handle Unassignment
  const handleUnassignPost = (postId: string) => {
    startTransition(async () => {
      setOptimisticPosts({ type: 'UNASSIGN', postId });
      await removePostFromSlot(postId, pathname);
    });
  };

  // Handle Tier Unlock
  const handleUnlockTier = () => {
    if (!nextTier) return;
    startTransition(async () => {
      const result = await redeemExpansionToken(nextTier, pathname);
      if (result.success && result.newTier !== undefined) {
        setLocalExpansionTier(result.newTier);
        setExpansionTier(result.newTier);
        setLocalMilestoneTokens(result.tokensRemaining ?? 0);
        setMilestoneTokens(result.tokensRemaining ?? 0);
        setUnlockedTier(result.newTier);
      }
    });
  };

  return (
    <>
      {/* ── Tier Unlock Celebration ─────────────────────────────────────────── */}
      {unlockedTier && (
        <TierUnlockOverlay
          newTier={unlockedTier}
          shell={currentShell}
          onDismiss={() => setUnlockedTier(null)}
        />
      )}

      <div className="w-full space-y-4">
        {/* ── Shell Control Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={TIER_NAMES[expansionTier]}>
              {TIER_BADGES[expansionTier]}
            </span>
            <div>
              <h2 className="text-base font-800 text-[--cozy-bark] leading-tight flex items-center gap-1.5">
                {currentShell.name}
                <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full
                  bg-[--cozy-amber]/15 text-[--cozy-rust] border border-[--cozy-amber]/30">
                  {TIER_NAMES[expansionTier]}
                </span>
              </h2>
              <p className="text-xs text-[--cozy-muted]">
                {slottedPostMap.size} of {activeSlots.length} nooks occupied
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Token balance */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full
              bg-[--cozy-gold]/15 border border-[--cozy-gold]/30 text-xs font-700 text-[--cozy-bark]"
              title="Milestone tokens"
            >
              <Coins size={12} className="text-[--cozy-gold]" />
              <span>{milestoneTokens}</span>
            </div>

            {/* Focus Mode Toggle */}
            <button
              onClick={() => setIsFocusMode((prev) => !prev)}
              title={isFocusMode ? 'View full estate' : 'Focus on active nook'}
              aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-700
                bg-white/80 dark:bg-zinc-800/80 text-[--cozy-bark]
                border border-[--cozy-amber]/30 cozy-shadow
                hover:scale-105 active:scale-95 transition-transform"
            >
              {isFocusMode
                ? <Minimize2 size={13} className="text-[--cozy-rust]" />
                : <Maximize2 size={13} className="text-[--cozy-muted]" />}
            </button>

            {/* Theme Switcher Button (Owner Only) */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700
                    bg-white/80 dark:bg-zinc-800/80 text-[--cozy-bark]
                    border border-[--cozy-amber]/30 cozy-shadow
                    hover:scale-105 active:scale-95 transition-transform"
                >
                  <Sparkles size={13} className="text-[--cozy-gold]" />
                  <span>Shell</span>
                </button>

                {/* Theme Dropdown Menu */}
                <AnimatePresence>
                  {isThemeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl p-2
                        cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-1"
                    >
                      <p className="text-[10px] font-700 text-[--cozy-muted] uppercase px-2 py-1">
                        Choose Architecture
                      </p>
                      {Object.values(SHELL_DEFINITIONS).map((def) => {
                        const isSelected = def.id === shellType;
                        const isThemeLocked = !themesUnlocked && def.themeTier > 1;
                        return (
                          <button
                            key={def.id}
                            onClick={() => !isThemeLocked && handleSelectShellType(def.id)}
                            disabled={isThemeLocked}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-600 text-left transition-colors ${
                              isThemeLocked
                                ? 'opacity-40 cursor-not-allowed text-[--cozy-muted]'
                                : isSelected
                                ? 'bg-[--cozy-rust] text-white shadow-sm'
                                : 'text-[--cozy-night] hover:bg-[--cozy-warm]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{def.badge.split(' ')[0]}</span>
                              <span>{def.name}</span>
                            </div>
                            {isThemeLocked ? (
                              <Lock size={11} className="text-[--cozy-muted]" />
                            ) : isSelected ? (
                              <Check size={14} />
                            ) : null}
                          </button>
                        );
                      })}
                      {!themesUnlocked && (
                        <p className="text-[9px] text-[--cozy-muted] px-2 py-1 italic">
                          Upload your first space to unlock all themes
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Unlock Next Tier Banner (owner only) ──────────────────────────── */}
        <AnimatePresence>
          {isOwner && nextTier && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl
                bg-white/40 dark:bg-black/20 backdrop-blur-md
                border border-[--cozy-amber]/25"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl flex-shrink-0">{TIER_BADGES[nextTier]}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-800 text-[--cozy-bark] truncate">
                      Unlock {TIER_NAMES[nextTier]}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {/* Token progress bar */}
                      <div className="flex-1 h-1.5 rounded-full bg-[--cozy-warm] overflow-hidden max-w-[80px]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[--cozy-amber] to-[--cozy-gold]"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((milestoneTokens / (nextTierCost ?? 1)) * 100, 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-[--cozy-muted] font-600 flex-shrink-0">
                        {milestoneTokens}/{nextTierCost} 🪙
                      </span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnlockTier}
                  disabled={!canUnlock || isPending}
                  className={`flex-shrink-0 ml-3 px-3.5 py-2 rounded-xl text-xs font-800
                    transition-all ${canUnlock
                      ? 'bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber] text-white shadow-md hover:opacity-90'
                      : 'bg-[--cozy-warm] text-[--cozy-muted] cursor-not-allowed'
                    }`}
                >
                  {canUnlock ? 'Unlock ✨' : 'Save up 🪙'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 2.5D Shell Container ────────────────────────────────────────── */}
        <div
          className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden
            shadow-2xl border-4 border-white/40 dark:border-zinc-800/40 select-none"
          style={{ background: currentShell.bgGradient }}
        >
          {/* ── Layer 1: Roof / Crown band ─────────────────────────────── */}
          <div
            className="absolute top-0 left-0 right-0 h-12 z-0 flex items-center justify-center"
            style={{ background: currentShell.roofGradient }}
          >
            {/* Ridge beam / crown ornament */}
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-[2px] rounded-full bg-white/25" />
              <span className="text-xs opacity-40 select-none" aria-hidden>
                {currentShell.badge.split(' ')[0]}
              </span>
              <div className="w-10 h-[2px] rounded-full bg-white/25" />
            </div>
          </div>

          {/* ── Layer 2: Wall body with theme texture overlay ───────────── */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: currentShell.wallTexture }}
          />

          {/* ── Layer 3: Floor slab gradient at the bottom ──────────────── */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 z-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${currentShell.themeColor}55 0%, transparent 100%)`,
            }}
          />

          {/* ── Structural Room Partition Lines (theme-aware) ───────────── */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* Horizontal partition — molding strip */}
            <div
              className="absolute top-1/2 left-4 right-4 -translate-y-1/2"
              style={{
                height: '2px',
                background: `linear-gradient(to right, transparent, ${currentShell.themeColor}60, transparent)`,
                boxShadow: `0 1px 3px ${currentShell.themeColor}30`,
              }}
            />
            {/* Vertical partition — structural beam */}
            <div
              className="absolute left-1/2 top-12 bottom-0 -translate-x-1/2"
              style={{
                width: '2px',
                background: `linear-gradient(to bottom, transparent, ${currentShell.themeColor}50, ${currentShell.themeColor}30, transparent)`,
                boxShadow: `1px 0 4px ${currentShell.themeColor}20, -1px 0 4px ${currentShell.themeColor}20`,
              }}
            />
          </div>

          {/* ── Per-slot ambient glow spots ─────────────────────────────── */}
          {activeSlots.map((slot) => (
            <div
              key={`glow-${slot.id}`}
              className="nook-ambient-glow absolute z-0 pointer-events-none rounded-full"
              style={{
                left: `${slot.x + slot.w / 2}%`,
                top: `${slot.y + slot.h / 2}%`,
                width: `${slot.w * 0.7}%`,
                height: `${slot.h * 0.7}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(ellipse, ${currentShell.accentColor}22 0%, transparent 70%)`,
              }}
            />
          ))}

          {/* Focus Mode overlay — zooms into the active corner slot */}
          <AnimatePresence>
            {isFocusMode && focusedSlot && (
              <motion.div
                key="focus-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[--cozy-night]/80 backdrop-blur-sm
                  flex items-center justify-center"
                onClick={() => setIsFocusMode(false)}
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="relative w-[72%] aspect-square"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShellNook
                    slot={{
                      ...focusedSlot,
                      // Override position to fill the focus container
                      x: 0, y: 0, w: 100, h: 100,
                    }}
                    post={slottedPostMap.get(focusedSlot.id)}
                    isOwner={isOwner}
                    isLocked={false}
                    onSelectEmptySlot={(s) => {
                      setIsFocusMode(false);
                      setSelectedSlotForAssignment(s);
                    }}
                    onUnassignPost={handleUnassignPost}
                    onViewPost={(p) => {
                      setIsFocusMode(false);
                      onPostSelect?.(p);
                    }}
                  />
                </motion.div>
                <p className="absolute bottom-4 text-xs text-white/50 font-600">
                  Tap outside to exit focus
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Dollhouse Mailbox (bottom-left) ── */}
          <div
            className="absolute bottom-3 left-3 z-20"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(122,79,58,0.25))' }}
          >
            {recipientId ? (
              <DollhouseMailbox
                isOwner={isOwner}
                peerStatus={peerStatus}
                pendingCards={pendingCards}
                recipientId={recipientId}
                currentUserId={currentUserId}
              />
            ) : null}
          </div>

          {/* Render Active Shell Nooks */}
          {activeSlots.map((slot) => {
            const assignedPost = slottedPostMap.get(slot.id);
            return (
              <ShellNook
                key={slot.id}
                slot={slot}
                post={assignedPost}
                isOwner={isOwner}
                isLocked={false}
                onSelectEmptySlot={(s) => setSelectedSlotForAssignment(s)}
                onUnassignPost={handleUnassignPost}
                onViewPost={(p) => onPostSelect?.(p)}
              />
            );
          })}

          {/* Render Locked Slot Placeholders */}
          {lockedSlots.map((slot) => (
            <ShellNook
              key={slot.id}
              slot={slot}
              isOwner={isOwner}
              isLocked
              onSelectEmptySlot={() => {}}
              onUnassignPost={() => {}}
              onViewPost={() => {}}
            />
          ))}
        </div>

        {/* ── Assign Post Picker Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {selectedSlotForAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md rounded-3xl p-6 cozy-glass border border-[--cozy-amber]/30 shadow-2xl max-h-[85vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[--cozy-amber]/20">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedSlotForAssignment.icon}</span>
                    <div>
                      <h3 className="text-base font-800 text-[--cozy-night]">
                        Assign to {selectedSlotForAssignment.label}
                      </h3>
                      <p className="text-xs text-[--cozy-muted]">
                        Pick an unassigned space to feature in this nook
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSlotForAssignment(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Unassigned Posts Grid */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                  {unassignedPosts.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <LayoutGrid size={32} className="mx-auto text-[--cozy-muted]" />
                      <p className="text-sm font-600 text-[--cozy-bark]">All your spaces are already assigned!</p>
                      <p className="text-xs text-[--cozy-muted]">Share a new space or unassign an existing nook first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {unassignedPosts.map((post) => {
                        const img = post.light_img_url || post.dark_img_url;
                        return (
                          <button
                            key={post.id}
                            onClick={() => handleAssignPost(post.id)}
                            className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-[--cozy-warm] border border-white/20 hover:scale-[1.03] active:scale-95 transition-all text-left shadow-md"
                          >
                            {img && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getOptimizedImageUrl(img, 300)}
                                alt="Space thumbnail"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                              <span className="text-[10px] font-600 text-rose-200">
                                ♥ {post.cheer_count}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-700 bg-[--cozy-rust] px-2 py-0.5 rounded-full">
                                Place <ArrowRight size={10} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
