'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CloudRain, Shield, Sparkles, X, Check, ShieldAlert } from 'lucide-react';
import { setRaincloudCascade } from '@/app/actions/waterfallActions';
import type { GroupPeer } from '@/app/actions/vibeActions';

interface AnchorBuddyModalProps {
  peers: GroupPeer[];
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function AnchorBuddyModal({ peers, onClose, onSuccess }: AnchorBuddyModalProps) {
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>(peers[0]?.userId || '');
  const [isPending, startTransition] = useTransition();

  const handleActivate = () => {
    startTransition(async () => {
      const res = await setRaincloudCascade(selectedAnchorId);
      if (res.success) {
        onSuccess?.(res.message || 'Serene Cascade activated.');
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-3xl p-6 cozy-glass border border-amber-500/30 shadow-2xl space-y-5"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌧️</span>
            <div>
              <h3 className="text-base font-800 text-[--cozy-bark]">Raincloud Status</h3>
              <p className="text-xs text-[--cozy-muted]">Serene Cascade Waterfall Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Protection Explanation */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-1.5 text-xs text-[--cozy-bark]">
          <p className="font-800 flex items-center gap-1.5 text-amber-600 dark:text-amber-300">
            <Shield size={14} /> Protecting Your Peace
          </p>
          <p className="text-[11px] text-[--cozy-muted] leading-relaxed">
            Instead of broadcasting 15 instant notifications, Cozy sends a single quiet check-in to your Primary Anchor. Other campmate notes sit silently in your Porch Holding Pen without noise or vibration.
          </p>
        </div>

        {/* Anchor Buddy Selector */}
        {peers.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-700 text-[--cozy-bark]">
              Select Your Primary Anchor Buddy (T=0 Check-in)
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {peers.map((peer) => {
                const isSelected = peer.userId === selectedAnchorId;
                return (
                  <button
                    key={peer.userId}
                    onClick={() => setSelectedAnchorId(peer.userId)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-700 transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-stone-950 shadow-md font-800'
                        : 'bg-white/40 dark:bg-zinc-800/40 text-[--cozy-bark] hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center text-[10px] font-800">
                        {peer.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{peer.displayName}</span>
                    </div>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleActivate}
            disabled={isPending}
            className="w-full py-3 rounded-2xl bg-amber-400 text-stone-950 font-800 text-xs shadow-lg hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={15} />
            {isPending ? 'Activating Serene Cascade...' : 'Activate Quiet Raincloud Status'}
          </button>

          {/* Emergency Safety Valve */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[--cozy-muted]">
            <span className="flex items-center gap-1">
              <ShieldAlert size={13} className="text-amber-500" /> Need immediate crisis support?
            </span>
            <a
              href="tel:988"
              className="font-800 text-amber-500 underline hover:text-amber-400"
            >
              Call 988
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
