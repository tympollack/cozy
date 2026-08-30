'use client';

import React, { useState, useEffect, useTransition, useOptimistic } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Check, ArrowRight, LayoutGrid,
  Lock, Coins, Camera,
} from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import {
  SHELL_DEFINITIONS,
  getShellDefinition,
  getActiveSlots,
  getLockedSlots,
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
  const { setExpansionTier, setMilestoneTokens, setThemesUnlocked } = useCozyStore();

  const [shellType, setShellType] = useState(initialShellType);
  const [expansionTier, setLocalExpansionTier] = useState(initialExpansionTier);
  const [milestoneTokens, setLocalMilestoneTokens] = useState(initialMilestoneTokens);
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<ShellSlot | null>(null);
  const [expandedPost, setExpandedPost] = useState<{ post: UserPost; slot: ShellSlot } | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unlockedTier, setUnlockedTier] = useState<number | null>(null); // celebration trigger

  useModalBackButton({
    isOpen: Boolean(selectedSlotForAssignment || expandedPost || isThemeMenuOpen),
    onClose: () => {
      if (selectedSlotForAssignment) setSelectedSlotForAssignment(null);
      else if (expandedPost) setExpandedPost(null);
      else if (isThemeMenuOpen) setIsThemeMenuOpen(false);
    },
  });

  // Sync server-provided authoritative expansion state into the client Zustand store
  useEffect(() => {
    if (isOwner) {
      setExpansionTier(initialExpansionTier);
      setMilestoneTokens(initialMilestoneTokens);
      setThemesUnlocked(themesUnlocked);
    }
  }, [initialExpansionTier, initialMilestoneTokens, themesUnlocked, isOwner, setExpansionTier, setMilestoneTokens, setThemesUnlocked]);

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

  const unassignedPosts = optimisticPosts.filter(
    (p) => !p.shell_slot || !isSlotInShell(p.shell_slot, currentShell)
  );

  const slottedPostMap = new Map<string, UserPost>();
  optimisticPosts.forEach((p) => {
    if (p.shell_slot && isSlotInShell(p.shell_slot, currentShell)) {
      slottedPostMap.set(p.shell_slot, p);
    }
  });

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
          <div className="flex items-center gap-2.5">
            <span className="text-2xl filter drop-shadow-xs" role="img" aria-label={TIER_NAMES[expansionTier]}>
              {TIER_BADGES[expansionTier]}
            </span>
            <div>
              <h2 className="text-base font-900 text-stone-900 dark:text-stone-100 leading-tight flex items-center gap-2">
                <span>{currentShell.name}</span>
                <span className="text-[10px] font-800 px-2 py-0.5 rounded-full
                  bg-stone-900 text-amber-100 dark:bg-amber-950/90 dark:text-amber-200 border border-stone-700 dark:border-amber-600/40 shadow-xs">
                  {TIER_NAMES[expansionTier]}
                </span>
              </h2>
              <p className="text-xs font-700 text-stone-700 dark:text-stone-300 mt-0.5">
                {slottedPostMap.size} of {activeSlots.length} nooks occupied
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Token balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 text-xs font-900 text-amber-950 dark:text-amber-200 shadow-xs"
              title="Milestone tokens"
            >
              <Coins size={13} className="text-amber-600 dark:text-amber-400" />
              <span>{milestoneTokens}</span>
            </div>

            {/* Theme Switcher Button (Owner Only) */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-800
                    bg-white dark:bg-[#281e19] text-stone-900 dark:text-amber-100
                    border border-amber-900/15 dark:border-amber-500/30 shadow-xs
                    hover:bg-amber-50 dark:hover:bg-[#342821] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
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
                        cozy-glass border border-amber-300/40 dark:border-amber-600/30 shadow-2xl space-y-1"
                    >
                      <p className="text-[10px] font-800 text-stone-700 dark:text-amber-300 uppercase px-2 py-1 tracking-wider">
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
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-700 text-left transition-colors cursor-pointer ${
                              isThemeLocked
                                ? 'opacity-40 cursor-not-allowed text-stone-500 dark:text-stone-400'
                                : isSelected
                                ? 'bg-amber-500 text-stone-950 font-800 shadow-sm'
                                : 'text-stone-800 dark:text-amber-100 hover:bg-amber-100/70 dark:hover:bg-amber-950/60'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{def.badge.split(' ')[0]}</span>
                              <span>{def.name}</span>
                            </div>
                            {isThemeLocked ? (
                              <Lock size={11} className="text-stone-500" />
                            ) : isSelected ? (
                              <Check size={14} />
                            ) : null}
                          </button>
                        );
                      })}
                      {!themesUnlocked && (
                        <p className="text-[9px] text-stone-500 dark:text-amber-400/80 px-2 py-1 italic">
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
                bg-amber-50/90 dark:bg-[#231a15] backdrop-blur-md
                border border-amber-200/90 dark:border-amber-600/30 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl flex-shrink-0">{TIER_BADGES[nextTier]}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-900 text-stone-900 dark:text-amber-100 truncate">
                      Unlock {TIER_NAMES[nextTier]}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Token progress bar */}
                      <div className="flex-1 h-2 rounded-full bg-amber-200/80 dark:bg-stone-800 overflow-hidden max-w-[90px]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((milestoneTokens / (nextTierCost ?? 1)) * 100, 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-amber-950 dark:text-amber-300 font-800 flex-shrink-0">
                        {milestoneTokens}/{nextTierCost} 🪙
                      </span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnlockTier}
                  disabled={!canUnlock || isPending}
                  className={`flex-shrink-0 ml-3 px-3.5 py-2 rounded-xl text-xs font-900
                    transition-all cursor-pointer ${canUnlock
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md hover:opacity-95'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-400 cursor-not-allowed'
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
          {/* ── Layer 1: Illustrated 2.5D Cutaway Interior Background ───────── */}
          {currentShell.interiorImage ? (
            <div className="absolute inset-0 z-0 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentShell.interiorImage}
                alt={currentShell.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-black/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            </div>
          ) : (
            <>
              {/* Fallback procedural roof / walls */}
              <div
                className="absolute top-0 left-0 right-0 h-12 z-0 flex items-center justify-center"
                style={{ background: currentShell.roofGradient }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-[2px] rounded-full bg-white/25" />
                  <span className="text-xs opacity-40 select-none" aria-hidden>
                    {currentShell.badge.split(' ')[0]}
                  </span>
                  <div className="w-10 h-[2px] rounded-full bg-white/25" />
                </div>
              </div>
              <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ background: currentShell.wallTexture }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-16 z-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${currentShell.themeColor}55 0%, transparent 100%)`,
                }}
              />
            </>
          )}

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
                onViewPost={(p) => {
                  setExpandedPost({ post: p, slot });
                  onPostSelect?.(p);
                }}
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

        {/* ── Expanded Post Lightbox Modal (Shared Element Zoom) ─────────── */}
        <AnimatePresence>
          {expandedPost && (
            <motion.div
              key="lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
              onClick={() => setExpandedPost(null)}
            >
              <motion.div
                layoutId={`nook-frame-${expandedPost.post.id}`}
                transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.75 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-3xl overflow-hidden bg-white dark:bg-[#1f1713] border border-amber-300/40 shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Lightbox Header */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ delay: 0.08, duration: 0.18 }}
                  className="flex items-center justify-between px-5 py-3.5 bg-amber-50/90 dark:bg-[#281e19] border-b border-amber-200/50 dark:border-amber-600/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{expandedPost.slot.icon}</span>
                    <div>
                      <h3 className="text-sm font-800 text-stone-900 dark:text-amber-100">
                        {expandedPost.slot.label}
                      </h3>
                      <p className="text-[11px] font-500 text-stone-600 dark:text-amber-300/70">
                        Featured in your {currentShell.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedPost(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-amber-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </motion.div>

                {/* Expanded Photo Container */}
                <div className="relative flex-1 min-h-[260px] max-h-[55vh] bg-stone-950 flex items-center justify-center overflow-hidden">
                  {expandedPost.post.light_img_url || expandedPost.post.dark_img_url ? (
                    <motion.img
                      layoutId={`nook-img-${expandedPost.post.id}`}
                      src={getOptimizedImageUrl(
                        expandedPost.post.light_img_url || expandedPost.post.dark_img_url || '',
                        1000
                      )}
                      alt={expandedPost.slot.label}
                      className="w-full h-full object-contain max-h-[55vh]"
                    />
                  ) : (
                    <div className="text-center py-16 text-amber-200 space-y-2">
                      <span className="text-5xl">{expandedPost.slot.icon}</span>
                      <p className="text-sm font-700">{expandedPost.slot.label}</p>
                    </div>
                  )}

                  {/* Stickers layer */}
                  {expandedPost.post.stickers && expandedPost.post.stickers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      transition={{ delay: 0.1 }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      {expandedPost.post.stickers.map((st) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={st.id}
                          src={st.sticker_url}
                          alt="Sticker"
                          className="absolute w-8 h-8 object-contain drop-shadow-md"
                          style={{
                            left: `${st.x_percent}%`,
                            top: `${st.y_percent}%`,
                            transform: `translate(-50%, -50%) rotate(${st.rotation_degrees}deg)`,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Lightbox Footer Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ delay: 0.08, duration: 0.18 }}
                  className="px-5 py-4 bg-amber-50/95 dark:bg-[#241a15] border-t border-amber-200/50 dark:border-amber-600/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/post/${expandedPost.post.id}`}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-900 bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>Decorate Space ✨</span>
                    </Link>

                    <span className="px-3 py-1.5 rounded-full text-xs font-900 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 text-stone-900 dark:text-amber-200 shadow-xs flex items-center gap-1">
                      ♥ {expandedPost.post.cheer_count}
                    </span>
                    {expandedPost.post.stickers && expandedPost.post.stickers.length > 0 && (
                      <span className="text-xs font-600 text-stone-600 dark:text-amber-200/80">
                        {expandedPost.post.stickers.length} sticker{expandedPost.post.stickers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => {
                        const postId = expandedPost.post.id;
                        setExpandedPost(null);
                        handleUnassignPost(postId);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-300 dark:border-red-700/40 transition-colors cursor-pointer"
                    >
                      Unsnap Space
                    </button>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    <div className="text-center py-8 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/30 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-400 shadow-xs">
                        <LayoutGrid size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-800 text-[--cozy-bark] dark:text-amber-100">
                          All your spaces are already assigned!
                        </p>
                        <p className="text-xs text-[--cozy-muted] mt-0.5 max-w-xs mx-auto">
                          Share a new space or unassign an existing nook first.
                        </p>
                      </div>
                      <div className="pt-2">
                        <Link
                          href="/camera"
                          onClick={() => setSelectedSlotForAssignment(null)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-800 text-xs bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <Camera size={14} />
                          <span>Create a New Space</span>
                        </Link>
                      </div>
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
