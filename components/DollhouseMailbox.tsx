'use client';

import React, { useState, useTransition, useOptimistic, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Mail, MailCheck, Clock, Check, XCircle, MessageSquareHeart } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  sendCallingCard,
  acceptCallingCard,
  declineCallingCard,
  type PeerStatus,
  type PendingCard,
} from '@/app/actions/peerActions';
import { getPrivateNotes, type PrivateSupportNote } from '@/app/actions/vibeActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DollhouseMailboxProps {
  /** True only when the authenticated user owns this profile. */
  isOwner: boolean;
  /** The relationship status from the viewer's perspective. */
  peerStatus: PeerStatus;
  /** Pending Calling Cards in the owner's inbox. Empty array for visitors. */
  pendingCards: PendingCard[];
  /** The profile owner's user ID (target for sendCallingCard). */
  recipientId: string;
  /** The authenticated user's ID; null when logged out. */
  currentUserId: string | null;
}

// ---------------------------------------------------------------------------
// Sub-component: The 2.5D Mailbox SVG Illustration
// ---------------------------------------------------------------------------

function MailboxBody({
  hasPending,
  flagUp,
}: {
  hasPending: boolean;
  flagUp: boolean;
}) {
  return (
    <div className="relative select-none" style={{ width: 64, height: 72 }}>
      {/* Glow halo when pending */}
      {hasPending && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: '0 0 20px 8px rgba(240,192,96,0.45)',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 56,
            height: 56,
            animation: 'mailboxGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Post (vertical stake) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 6,
          height: 22,
          background: 'linear-gradient(to bottom, #c4704a, #7a4f3a)',
          borderRadius: '2px 2px 3px 3px',
          boxShadow: '2px 0 0 rgba(0,0,0,0.15)',
        }}
      />

      {/* Mailbox body */}
      <div
        className="absolute"
        style={{
          bottom: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 48,
          height: 34,
          background: 'linear-gradient(160deg, #e8a87c 0%, #c4704a 60%, #a85a38 100%)',
          borderRadius: '24px 24px 8px 8px',
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.25),
            inset 0 -2px 4px rgba(0,0,0,0.20),
            2px 4px 8px rgba(122,79,58,0.35),
            4px 8px 0 rgba(122,79,58,0.12)
          `,
        }}
      >
        {/* Door slot */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 3,
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 2,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        />

        {/* Door highlight */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 8,
            width: 14,
            height: 10,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '50%',
            filter: 'blur(3px)',
          }}
        />
      </div>

      {/* Animated Flag */}
      <motion.div
        animate={{ rotate: flagUp ? -90 : 0, y: flagUp ? -4 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          position: 'absolute',
          bottom: 34,
          right: 6,
          transformOrigin: 'bottom center',
          width: 14,
          height: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 2,
            height: 20,
            background: 'linear-gradient(to bottom, #c4704a, #7a4f3a)',
            borderRadius: 1,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 2,
            width: 10,
            height: 8,
            background: flagUp
              ? 'linear-gradient(135deg, #f0c060, #e8a830)'
              : 'linear-gradient(135deg, #c4704a, #a85a38)',
            borderRadius: '0 4px 4px 0',
            boxShadow: flagUp ? '0 1px 4px rgba(240,192,96,0.6)' : undefined,
          }}
        />
      </motion.div>

      {/* Pending count badge */}
      <AnimatePresence>
        {hasPending && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              position: 'absolute',
              top: 14,
              right: 0,
              minWidth: 18,
              height: 18,
              background: 'linear-gradient(135deg, #f0c060, #e8a830)',
              color: '#7a4f3a',
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 99,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 6px rgba(240,192,96,0.5)',
              border: '1.5px solid #fff',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Pending Card Row in the modal
// ---------------------------------------------------------------------------

function CallingCardRow({
  card,
  onAccept,
  onDecline,
  isPending,
}: {
  card: PendingCard;
  onAccept: (peerId: string) => void;
  onDecline: (peerId: string) => void;
  isPending: boolean;
}) {
  const sentDate = new Date(card.sentAt);
  const timeAgo = formatTimeAgo(sentDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-3 p-3 rounded-2xl border border-[--cozy-amber]/20 bg-white/50"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-800"
        style={{
          background: 'linear-gradient(135deg, var(--cozy-amber), var(--cozy-rust))',
          color: 'white',
        }}
      >
        {card.requesterName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-700 text-[--cozy-bark] truncate">{card.requesterName}</p>
        <p className="text-[10px] text-[--cozy-muted] flex items-center gap-1 mt-0.5">
          <Clock size={10} />
          {timeAgo}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          id={`accept-card-${card.peerId}`}
          onClick={() => onAccept(card.peerId)}
          disabled={isPending}
          title="Accept Calling Card (+5 pts)"
          className="w-9 h-9 rounded-full flex items-center justify-center
            bg-[--cozy-gold] text-[--cozy-bark]
            hover:scale-110 active:scale-95 transition-transform
            disabled:opacity-50 shadow-sm"
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button
          id={`decline-card-${card.peerId}`}
          onClick={() => onDecline(card.peerId)}
          disabled={isPending}
          title="Decline"
          className="w-9 h-9 rounded-full flex items-center justify-center
            bg-white text-[--cozy-muted] border border-[--cozy-amber]/30
            hover:scale-110 active:scale-95 transition-transform
            disabled:opacity-50 shadow-sm"
        >
          <XCircle size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DollhouseMailbox({
  isOwner,
  peerStatus,
  pendingCards: initialPendingCards,
  recipientId,
  currentUserId,
}: DollhouseMailboxProps) {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'notes'>('cards');
  const [privateNotes, setPrivateNotes] = useState<PrivateSupportNote[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(peerStatus === 'pending_sent');
  const modalRef = useRef<HTMLDivElement>(null);

  const [optimisticCards, removeCard] = useOptimistic(
    initialPendingCards,
    (state, peerId: string) => state.filter((c) => c.peerId !== peerId)
  );

  const hasPending = isOwner && optimisticCards.length > 0;
  const flagUp = hasPending;

  useEffect(() => {
    if (isModalOpen && isOwner && recipientId) {
      getPrivateNotes(recipientId).then(setPrivateNotes);
    }
  }, [isModalOpen, isOwner, recipientId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsModalOpen(false);
      }
    }
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isModalOpen]);

  function handleAccept(peerId: string) {
    startTransition(async () => {
      removeCard(peerId);
      const result = await acceptCallingCard(peerId, pathname);
      if (!result.success) {
        console.error('[Mailbox] Accept failed:', result.error);
      }
    });
  }

  function handleDecline(peerId: string) {
    startTransition(async () => {
      removeCard(peerId);
      const result = await declineCallingCard(peerId, pathname);
      if (!result.success) {
        console.error('[Mailbox] Decline failed:', result.error);
      }
    });
  }

  function handleSendCard() {
    if (!currentUserId || hasSent) return;
    setSendError(null);
    setHasSent(true);

    startTransition(async () => {
      const result = await sendCallingCard(recipientId, pathname);
      if (!result.success) {
        setHasSent(false);
        setSendError(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <>
      <style>{`
        @keyframes mailboxGlow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-1.5 relative">
        <AnimatePresence mode="wait">
          {isOwner && hasPending && (
            <motion.div
              key="owner-pending"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700"
              style={{
                background: 'linear-gradient(135deg, rgba(240,192,96,0.9), rgba(232,168,124,0.9))',
                color: 'var(--cozy-bark)',
                boxShadow: '0 2px 8px rgba(240,192,96,0.4)',
              }}
            >
              <Mail size={10} />
              {optimisticCards.length} card{optimisticCards.length !== 1 ? 's' : ''}
            </motion.div>
          )}

          {peerStatus === 'accepted' && (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700"
              style={{
                background: 'rgba(240,192,96,0.15)',
                border: '1px solid rgba(240,192,96,0.5)',
                color: 'var(--cozy-bark)',
              }}
            >
              <Heart size={10} className="fill-[--cozy-gold] text-[--cozy-gold]" />
              Peer
            </motion.div>
          )}

          {(hasSent || peerStatus === 'pending_sent') && (
            <motion.div
              key="pending-sent"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600"
              style={{
                background: 'rgba(122,79,58,0.08)',
                color: 'var(--cozy-muted)',
              }}
            >
              <MailCheck size={10} />
              Card Sent
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          id={isOwner ? 'mailbox-owner' : 'mailbox-visitor'}
          whileHover={!isOwner && peerStatus === 'none' && !hasSent ? { scale: 1.08 } : {}}
          whileTap={!isOwner && peerStatus === 'none' && !hasSent ? { scale: 0.95 } : {}}
          onClick={
            isOwner
              ? () => setIsModalOpen(true)
              : peerStatus === 'none' && !hasSent
              ? handleSendCard
              : undefined
          }
          className="relative focus:outline-none"
          aria-label={
            isOwner
              ? 'Open Mailbox'
              : peerStatus === 'accepted'
              ? 'Peer'
              : 'Leave Calling Card'
          }
          style={{ cursor: isOwner || (peerStatus === 'none' && !hasSent) ? 'pointer' : 'default' }}
        >
          <MailboxBody hasPending={hasPending} flagUp={flagUp} />
        </motion.button>

        <AnimatePresence>
          {sendError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-[--cozy-rust] font-600 text-center max-w-[80px]"
            >
              {sendError}
            </motion.p>
          )}
        </AnimatePresence>

        {!currentUserId && !isOwner && (
          <p className="text-[9px] text-[--cozy-muted] text-center leading-tight">
            Log in to connect
          </p>
        )}
      </div>

      {/* Owner Mailbox Modal */}
      <AnimatePresence>
        {isOwner && isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl overflow-hidden"
              style={{
                boxShadow: '0 20px 60px rgba(84, 50, 32, 0.25)',
              }}
            >
              {/* Modal Header */}
              <div
                className="px-5 pt-5 pb-3 border-b border-[--cozy-amber]/20"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(240,192,96,0.12), rgba(232,168,124,0.08))',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, var(--cozy-gold), var(--cozy-amber))',
                      }}
                    >
                      <Mail size={17} className="text-[--cozy-bark]" />
                    </div>
                    <div>
                      <h3 className="text-base font-800 text-[--cozy-bark] leading-tight">
                        Your Dollhouse Mailbox
                      </h3>
                      <p className="text-[10px] text-[--cozy-muted]">
                        Calling cards & Porch Support holding pen
                      </p>
                    </div>
                  </div>
                  <button
                    id="mailbox-modal-close"
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 mt-3 p-1 rounded-xl bg-[--cozy-amber]/10 border border-[--cozy-amber]/20">
                  <button
                    onClick={() => setActiveTab('cards')}
                    className={`py-1.5 rounded-lg text-xs font-800 transition-all ${
                      activeTab === 'cards'
                        ? 'bg-white text-[--cozy-bark] shadow-sm'
                        : 'text-[--cozy-muted] hover:text-[--cozy-bark]'
                    }`}
                  >
                    Calling Cards ({optimisticCards.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`py-1.5 rounded-lg text-xs font-800 transition-all ${
                      activeTab === 'notes'
                        ? 'bg-white text-[--cozy-bark] shadow-sm'
                        : 'text-[--cozy-muted] hover:text-[--cozy-bark]'
                    }`}
                  >
                    Porch Support ({privateNotes.length})
                  </button>
                </div>
              </div>

              {/* Cards / Porch Support List */}
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {activeTab === 'cards' ? (
                  <AnimatePresence mode="popLayout">
                    {optimisticCards.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 space-y-2"
                      >
                        <Mail size={28} className="mx-auto text-[--cozy-muted] opacity-40" />
                        <p className="text-sm font-600 text-[--cozy-muted]">All caught up!</p>
                        <p className="text-xs text-[--cozy-muted] opacity-70">
                          New Calling Cards will appear here.
                        </p>
                      </motion.div>
                    ) : (
                      optimisticCards.map((card) => (
                        <CallingCardRow
                          key={card.peerId}
                          card={card}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                          isPending={isPending}
                        />
                      ))
                    )}
                  </AnimatePresence>
                ) : (
                  <div className="space-y-2.5">
                    {privateNotes.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <MessageSquareHeart size={28} className="mx-auto text-[--cozy-amber] opacity-40" />
                        <p className="text-sm font-600 text-[--cozy-bark]">No porch items yet</p>
                        <p className="text-xs text-[--cozy-muted] opacity-75">
                          Supportive notes & comfort stickers left on your porch will appear here.
                        </p>
                      </div>
                    ) : (
                      privateNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-2xl bg-white/80 border border-[--cozy-amber]/25 shadow-sm space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-800 text-[--cozy-bark]">
                            <span className="flex items-center gap-1.5">
                              <Heart size={12} className="fill-[--cozy-gold] text-[--cozy-gold]" />
                              <span>From {note.senderName}</span>
                              <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full bg-[--cozy-amber]/15 text-[--cozy-rust]">
                                Porch Support
                              </span>
                            </span>
                            <span className="text-[10px] text-[--cozy-muted] font-500">
                              {formatTimeAgo(new Date(note.sentAt))}
                            </span>
                          </div>
                          <p className="text-xs text-[--cozy-bark] font-500 leading-relaxed pt-0.5">
                            &quot;{note.message}&quot;
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
