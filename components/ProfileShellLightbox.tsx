'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Sun, Moon } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { getDefaultTimeMode, type CaptureMode } from '@/lib/photoTimeUtils';
import type { ShellSlot } from '@/config/shellDefinitions';
import type { UserPost } from '@/store/useCozyStore';

export interface ProfileShellLightboxProps {
  expandedPost: { post: UserPost; slot: ShellSlot } | null;
  currentShellName: string;
  isOwner: boolean;
  onClose: () => void;
  onUnassignPost: (postId: string) => void;
}

export function ProfileShellLightbox({
  expandedPost,
  currentShellName,
  isOwner,
  onClose,
  onUnassignPost,
}: ProfileShellLightboxProps) {
  const [lightboxMode, setLightboxMode] = useState<CaptureMode>('light');

  useEffect(() => {
    if (expandedPost?.post) {
      setLightboxMode(getDefaultTimeMode(expandedPost.post));
    }
  }, [expandedPost?.post]);

  return (
    <AnimatePresence>
      {expandedPost && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
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
                    {isOwner ? `Featured in your ${currentShellName}` : `Featured in ${currentShellName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-amber-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </motion.div>

            {/* Expanded Photo Container */}
            <div className="relative flex-1 min-h-[260px] max-h-[55vh] bg-stone-950 flex items-center justify-center overflow-hidden">
              {expandedPost.post.light_img_url && expandedPost.post.dark_img_url ? (
                <>
                  <motion.img
                    src={getOptimizedImageUrl(expandedPost.post.dark_img_url, 1000)}
                    alt={expandedPost.slot.label}
                    className="w-full h-full object-contain max-h-[55vh]"
                    initial={false}
                    animate={{ opacity: lightboxMode === 'dark' ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                  <motion.img
                    src={getOptimizedImageUrl(expandedPost.post.light_img_url, 1000)}
                    alt={expandedPost.slot.label}
                    className="absolute inset-0 w-full h-full object-contain max-h-[55vh]"
                    initial={false}
                    animate={{ opacity: lightboxMode === 'light' ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxMode((m) => (m === 'light' ? 'dark' : 'light'))}
                    aria-label={`Switch to ${lightboxMode === 'light' ? 'evening' : 'daytime'} view`}
                    className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/30 text-white shadow-xl transition-all active:scale-95 cursor-pointer"
                  >
                    {lightboxMode === 'light' ? (
                      <>
                        <Sun size={13} className="text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-800 text-amber-200">Day View</span>
                      </>
                    ) : (
                      <>
                        <Moon size={13} className="text-sky-300 fill-sky-300" />
                        <span className="text-[11px] font-800 text-sky-200">Night View</span>
                      </>
                    )}
                  </button>
                </>
              ) : expandedPost.post.light_img_url || expandedPost.post.dark_img_url ? (
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
                    onClose();
                    onUnassignPost(postId);
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
  );
}
