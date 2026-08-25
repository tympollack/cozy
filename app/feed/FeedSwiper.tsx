'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { useCozyStore } from '@/store/useCozyStore';
import { getFeed } from '@/app/actions/postActions';
import { cheerPost } from '@/app/actions/cheerActions';
import type { FeedPost } from '@/store/useCozyStore';
import { Home, RefreshCw } from 'lucide-react';

interface FeedSwiperProps {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  isAuthenticated?: boolean;
}

const CARD_OFFSET = 12;  // px between stacked cards
const CARD_SCALE  = 0.04; // scale decrement per depth level

export function FeedSwiper({ initialPosts, initialCursor, isAuthenticated = false }: FeedSwiperProps) {
  const { appendFeed, setFeedCursor, feed, feedCursor, removeFromFeed, setPoints, addPoints } =
    useCozyStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Hydrate store with server-fetched initial data
  useEffect(() => {
    if (initialPosts.length > 0) {
      appendFeed(initialPosts);
      setFeedCursor(initialCursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePosts = feed.slice(currentIndex, currentIndex + 3);

  // Fetch more when within 2 cards of the end
  useEffect(() => {
    if (feed.length - currentIndex <= 2 && feedCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      getFeed(feedCursor).then(({ posts, nextCursor }) => {
        if (posts.length > 0) {
          appendFeed(posts);
          setFeedCursor(nextCursor);
        } else {
          setIsEmpty(true);
        }
        setIsLoadingMore(false);
      });
    }
  }, [currentIndex, feed.length, feedCursor, isLoadingMore, appendFeed, setFeedCursor]);

  // --- Swipe/drag logic ---
  const SWIPE_THRESHOLD = 80;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    cardRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - dragStartRef.current.x);
    setDragY(e.clientY - dragStartRef.current.y);
  }, [isDragging]);

  const dismiss = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    setDragX(0);
    setDragY(0);
    setIsDragging(false);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging) return;
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      dismiss();
    } else {
      setDragX(0);
      setDragY(0);
    }
    setIsDragging(false);
  }, [isDragging, dragX, dismiss]);

  // --- Empty state & Auth gating ---
  const hitAuthLimit = !isAuthenticated && currentIndex >= 7;

  if (hitAuthLimit) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-sm mt-12 px-6 text-center">
        <Home className="w-12 h-12 text-[--cozy-bark] mb-4 opacity-50" />
        <h2 className="text-xl font-800 text-[--cozy-bark] mb-2">Sign in to see more</h2>
        <p className="text-[--cozy-muted] mb-8">
          Join Cozy to keep swiping, share your own space, and cheer on others!
        </p>
        <a 
          href="/login?next=/feed"
          className="bg-[--cozy-bark] text-white px-8 py-3 rounded-full font-700 shadow-md hover:scale-105 transition-transform"
        >
          Sign in with Sunshade Hub
        </a>
      </div>
    );
  }

  // --- Cheer handler ---
  const handleCheer = useCallback(async (postId: string) => {
    const result = await cheerPost(postId);
    if (result.success && result.newPoints !== undefined) {
      setPoints(result.newPoints);
    }
  }, [setPoints]);

  // --- Empty state ---
  if (isEmpty && visiblePosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="text-6xl" role="img" aria-label="House">🏡</div>
        <div>
          <h2 className="text-xl font-700 text-[--cozy-bark] mb-2">You've seen it all!</h2>
          <p className="text-sm text-[--cozy-muted]">Check back later for new cozy spaces.</p>
        </div>
        <button
          id="feed-refresh-btn"
          onClick={() => {
            setCurrentIndex(0);
            setIsEmpty(false);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-600
            bg-[--cozy-rust] text-white hover:opacity-90 active:scale-95 transition-all cozy-shadow"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Start over
        </button>
      </div>
    );
  }

  // --- Loading skeleton ---
  if (visiblePosts.length === 0) {
    return (
      <div className="card-stack mx-auto">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="swipe-card bg-[--cozy-warm] animate-pulse"
            style={{
              transform: `translateY(${i * CARD_OFFSET}px) scale(${1 - i * CARD_SCALE})`,
              zIndex: 3 - i,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto flex-1 flex flex-col items-center justify-center gap-6 overflow-hidden w-full relative">
      {/* Card stack */}
      <div
        id="feed-card-stack"
        className="card-stack"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {visiblePosts.map((post, depth) => {
          const isTop = depth === 0;
          const rotate = isTop && isDragging ? dragX * 0.06 : 0;
          const translateX = isTop && isDragging ? dragX : 0;
          const translateY = isTop && isDragging ? dragY * 0.3 : depth * CARD_OFFSET;
          const scale = isTop ? 1 : 1 - depth * CARD_SCALE;

          return (
            <div
              key={post.id}
              ref={isTop ? cardRef : undefined}
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                zIndex: 10 - depth,
                transition: isDragging && isTop ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              className={`swipe-card absolute inset-0 m-auto ${isTop ? 'card-enter' : ''}`}
              aria-hidden={!isTop}
            >
              <PostCard
                post={post}
                onCheer={() => handleCheer(post.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Skip button */}
      {visiblePosts.length > 0 && (
        <button
          id="feed-skip-btn"
          onClick={dismiss}
          className="text-sm text-[--cozy-muted] hover:text-[--cozy-rust] transition-colors
            flex items-center gap-1.5 underline underline-offset-4"
          aria-label="Skip to next post"
        >
          Skip this one →
        </button>
      )}

      {/* Loading indicator */}
      {isLoadingMore && (
        <p className="text-xs text-[--cozy-muted]" aria-live="polite">
          Loading more spaces…
        </p>
      )}

      {/* Card counter */}
      <p className="text-xs text-[--cozy-muted]/60 tabular-nums" aria-live="polite">
        {Math.max(0, feed.length - currentIndex)} homes left to explore
      </p>
    </div>
  );
}
