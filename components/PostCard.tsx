'use client';

import { useState, useCallback } from 'react';
import { Sun, Moon, Heart, MapPin } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import type { FeedPost } from '@/store/useCozyStore';

interface PostCardProps {
  post: FeedPost;
  onCheer: () => Promise<void>;
  style?: React.CSSProperties;
  className?: string;
}

export function PostCard({ post, onCheer, style, className = '' }: PostCardProps) {
  const [showDark, setShowDark] = useState(false);
  const [cheering, setCheering] = useState(false);
  const [cheered, setCheered] = useState(post.has_cheered);
  const [cheerCount, setCheerCount] = useState(post.cheer_count);

  const activeUrl = showDark ? post.dark_img_url : post.light_img_url;

  const handleCheer = useCallback(async () => {
    if (cheered || cheering) return;
    setCheering(true);
    // Optimistic update
    setCheered(true);
    setCheerCount((c) => c + 1);
    try {
      await onCheer();
    } catch {
      // Rollback on failure
      setCheered(false);
      setCheerCount((c) => c - 1);
    } finally {
      setCheering(false);
    }
  }, [cheered, cheering, onCheer]);

  return (
    <div
      style={style}
      className={`swipe-card cozy-shadow-lg bg-white ${className}`}
    >
      {/* Image */}
      <div className="relative w-full h-full">
        <img
          src={getOptimizedImageUrl(activeUrl, 800)}
          alt={showDark ? 'Night time room photo' : 'Day time room photo'}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Day/Night toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 toggle-pill cozy-shadow">
          <button
            id="card-light-btn"
            className={`toggle-option ${!showDark ? 'active' : ''}`}
            onClick={() => setShowDark(false)}
            aria-pressed={!showDark}
            aria-label="View daytime photo"
          >
            <Sun size={14} className="inline mr-1" />
            Light
          </button>
          <button
            id="card-dark-btn"
            className={`toggle-option ${showDark ? 'active' : ''}`}
            onClick={() => setShowDark(true)}
            aria-pressed={showDark}
            aria-label="View night-time photo"
          >
            <Moon size={14} className="inline mr-1" />
            Dark
          </button>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          {/* Location hash pill */}
          {post.obfuscated_location_hash && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cozy-glass-dark">
              <MapPin size={12} className="text-amber-300" aria-hidden="true" />
              <span className="text-xs font-500 text-white/90 font-mono">
                {post.obfuscated_location_hash}
              </span>
            </div>
          )}

          {/* Cheer button */}
          <button
            id={`cheer-btn-${post.id}`}
            onClick={handleCheer}
            disabled={cheered || cheering}
            aria-label={cheered ? 'Already cheered' : 'Cheer this home'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-600 text-sm
              transition-all duration-200 cozy-shadow
              ${cheered
                ? 'bg-rose-500 text-white cursor-default'
                : 'bg-white text-[--cozy-rust] hover:bg-rose-50 active:scale-95'
              }
              ${cheering ? 'cheer-pop' : ''}
            `}
          >
            <Heart
              size={16}
              className={cheered ? 'fill-white' : 'fill-transparent'}
              aria-hidden="true"
            />
            <span className="tabular-nums">{cheerCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
