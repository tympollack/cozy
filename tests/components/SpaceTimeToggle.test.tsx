import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShellNook } from '@/components/ShellNook';
import { PostCard } from '@/components/PostCard';
import type { UserPost, FeedPost } from '@/store/useCozyStore';
import type { ShellSlot } from '@/config/shellDefinitions';

const mockSlot: ShellSlot = {
  id: 'attic_study',
  label: 'Attic Study',
  icon: '📚',
  tier: 1,
  x: 50,
  y: 30,
  w: 20,
  h: 20,
};

const mockDualPost: UserPost = {
  id: 'post-dual-1',
  user_id: 'user-1',
  light_img_url: 'https://cdn.cozy.space/room-day.jpg',
  dark_img_url: 'https://cdn.cozy.space/room-night.jpg',
  created_at: new Date().toISOString(),
  cheer_count: 5,
  stickers: [],
  item_pins: [],
  obfuscated_location_hash: 'Brooklyn, NY',
  shell_slot: 'attic_study',
};

const mockFeedPost: FeedPost = {
  ...mockDualPost,
  has_cheered: false,
  is_toxic: false,
};

describe('Time-Aware Default & Interactive Light/Dark View Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ShellNook Toggle Integration', () => {
    it('renders sun/moon toggle button when nook post contains dual captures', () => {
      render(
        <ShellNook
          slot={mockSlot}
          post={mockDualPost}
          isOwner={true}
          onSelectEmptySlot={vi.fn()}
          onUnassignPost={vi.fn()}
          onViewPost={vi.fn()}
        />
      );

      const toggleBtn = screen.getByLabelText(/Toggle light\/dark view for Attic Study/i);
      expect(toggleBtn).toBeInTheDocument();
    });

    it('interactively toggles view mode without triggering nook expansion', async () => {
      const user = userEvent.setup();
      const onViewPost = vi.fn();

      render(
        <ShellNook
          slot={mockSlot}
          post={mockDualPost}
          isOwner={true}
          onSelectEmptySlot={vi.fn()}
          onUnassignPost={vi.fn()}
          onViewPost={onViewPost}
        />
      );

      const toggleBtn = screen.getByLabelText(/Toggle light\/dark view for Attic Study/i);
      const initialTitle = toggleBtn.getAttribute('title');

      await user.click(toggleBtn);

      // onViewPost should NOT have been called because click was stopped
      expect(onViewPost).not.toHaveBeenCalled();

      // Title should have inverted
      const toggledTitle = toggleBtn.getAttribute('title');
      expect(toggledTitle).not.toBe(initialTitle);
    });

    it('resets image error state when post is replaced or updated', () => {
      const singlePost: UserPost = {
        ...mockDualPost,
        id: 'post-single-1',
        dark_img_url: '',
        light_img_url: 'https://cdn.cozy.space/broken.jpg',
      };

      const { rerender } = render(
        <ShellNook
          slot={mockSlot}
          post={singlePost}
          isOwner={true}
          onSelectEmptySlot={vi.fn()}
          onUnassignPost={vi.fn()}
          onViewPost={vi.fn()}
        />
      );

      const initialImg = screen.getByAltText(mockSlot.label);
      expect(initialImg).toBeInTheDocument();

      // Trigger image error on current post
      fireEvent.error(initialImg);

      // Now fallback text should be present since image errored
      expect(screen.queryByAltText(mockSlot.label)).not.toBeInTheDocument();

      // Re-assign or replace with a new valid post
      const replacementPost: UserPost = {
        ...mockDualPost,
        id: 'post-replacement-2',
        dark_img_url: '',
        light_img_url: 'https://cdn.cozy.space/valid.jpg',
      };

      rerender(
        <ShellNook
          slot={mockSlot}
          post={replacementPost}
          isOwner={true}
          onSelectEmptySlot={vi.fn()}
          onUnassignPost={vi.fn()}
          onViewPost={vi.fn()}
        />
      );

      // New image should be rendered and not blocked by previous error state
      expect(screen.getByAltText(mockSlot.label)).toBeInTheDocument();
    });
  });

  describe('PostCard / FeedPostCard Toggle Integration', () => {
    it('renders interactive day/night toggle button on dual capture feed post', () => {
      render(
        <PostCard
          post={mockFeedPost}
          onCheer={vi.fn()}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /Switch to (evening|daytime) view/i });
      expect(toggleBtn).toBeInTheDocument();
    });

    it('toggles between day and night mode on click', async () => {
      const user = userEvent.setup();

      render(
        <PostCard
          post={mockFeedPost}
          onCheer={vi.fn()}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /Switch to (evening|daytime) view/i });
      const initialText = toggleBtn.textContent;

      await user.click(toggleBtn);

      const newText = toggleBtn.textContent;
      expect(newText).not.toBe(initialText);
    });
  });
});
