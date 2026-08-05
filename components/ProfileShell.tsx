'use client';

import React, { useState, useTransition, useOptimistic } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Home, X, Check, ArrowRight, LayoutGrid } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import {
  SHELL_DEFINITIONS,
  getShellDefinition,
  isSlotInShell,
  type ShellSlot,
} from '@/config/shellDefinitions';
import { ShellNook } from './ShellNook';
import { updateUserShell, assignPostToSlot, removePostFromSlot } from '@/app/actions/shellActions';
import type { UserPost } from '@/store/useCozyStore';
import { DollhouseMailbox } from './DollhouseMailbox';
import type { PeerStatus, PendingCard } from '@/app/actions/peerActions';

interface ProfileShellProps {
  initialShellType: string;
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
  posts: initialPosts,
  isOwner,
  onPostSelect,
  peerStatus = 'none',
  pendingCards = [],
  recipientId = '',
  currentUserId = null,
}: ProfileShellProps) {
  const pathname = usePathname();
  const [shellType, setShellType] = useState(initialShellType);
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<ShellSlot | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Optimistic state for posts assignment
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(
    initialPosts,
    (state, action: { type: 'ASSIGN'; postId: string; slotId: string } | { type: 'UNASSIGN'; postId: string } | { type: 'SWITCH_THEME'; validSlotIds: string[] }) => {
      if (action.type === 'ASSIGN') {
        return state.map((p) => {
          if (p.shell_slot === action.slotId) {
            return { ...p, shell_slot: null }; // clear previous occupant
          }
          if (p.id === action.postId) {
            return { ...p, shell_slot: action.slotId };
          }
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

  // A post is only unassigned if it has no shell_slot OR its shell_slot does not belong to currentShell
  const unassignedPosts = optimisticPosts.filter(
    (p) => !p.shell_slot || !isSlotInShell(p.shell_slot, currentShell)
  );

  // Map of slotId -> assigned UserPost (only for valid slots of the active theme)
  const slottedPostMap = new Map<string, UserPost>();
  optimisticPosts.forEach((p) => {
    if (p.shell_slot && isSlotInShell(p.shell_slot, currentShell)) {
      slottedPostMap.set(p.shell_slot, p);
    }
  });

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

  return (
    <div className="w-full space-y-4">
      {/* ── Shell Control Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{currentShell.badge.split(' ')[0]}</span>
          <div>
            <h2 className="text-base font-800 text-[--cozy-bark] leading-tight">
              {currentShell.name}
            </h2>
            <p className="text-xs text-[--cozy-muted]">
              {slottedPostMap.size} of {currentShell.slots.length} nooks occupied
            </p>
          </div>
        </div>

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
              <span>Switch Shell</span>
            </button>

            {/* Theme Dropdown Menu */}
            <AnimatePresence>
              {isThemeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl p-2
                    cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-1"
                >
                  <p className="text-[10px] font-700 text-[--cozy-muted] uppercase px-2 py-1">
                    Choose Architecture
                  </p>
                  {Object.values(SHELL_DEFINITIONS).map((def) => {
                    const isSelected = def.id === shellType;
                    return (
                      <button
                        key={def.id}
                        onClick={() => handleSelectShellType(def.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-600 text-left transition-colors ${
                          isSelected
                            ? 'bg-[--cozy-rust] text-white shadow-sm'
                            : 'text-[--cozy-night] hover:bg-[--cozy-warm]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{def.badge.split(' ')[0]}</span>
                          <span>{def.name}</span>
                        </div>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── 2.5D Shell Container ────────────────────────────────────────── */}
      <div
        className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden
          shadow-2xl border-4 border-white/40 dark:border-zinc-800/40 select-none"
        style={{ background: currentShell.bgGradient }}
      >
        {/* Roof / Crown Architecture Banner */}
        <div
          className="absolute top-0 left-0 right-0 h-10 z-0 flex items-center justify-center opacity-80"
          style={{ background: currentShell.roofGradient }}
        >
          <div className="w-24 h-1 rounded-full bg-white/30" />
        </div>

        {/* Ambient Wall Partition Grid Lines (2.5D Room Structure) */}
        <div className="absolute inset-0 z-0 pointer-events-none p-4">
          <div className="w-full h-full rounded-2xl border-2 border-white/10 flex flex-col justify-between">
            {/* Horizontal divider */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent my-auto" />
          </div>
          {/* Vertical divider */}
          <div className="absolute inset-y-4 left-1/2 w-0.5 bg-gradient-to-b from-transparent via-white/20 to-transparent -translate-x-1/2" />
        </div>

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

        {/* Render Shell Nooks */}
        {currentShell.slots.map((slot) => {
          const assignedPost = slottedPostMap.get(slot.id);
          return (
            <ShellNook
              key={slot.id}
              slot={slot}
              post={assignedPost}
              isOwner={isOwner}
              onSelectEmptySlot={(s) => setSelectedSlotForAssignment(s)}
              onUnassignPost={handleUnassignPost}
              onViewPost={(p) => onPostSelect?.(p)}
            />
          );
        })}
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
  );
}
