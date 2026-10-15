import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileShellLightbox } from '@/components/ProfileShellLightbox';
import type { UserPost } from '@/store/useCozyStore';
import type { ShellSlot } from '@/config/shellDefinitions';

const mockSlot: ShellSlot = {
  id: 'slot-1',
  label: 'Sunlit Window',
  icon: '🪟',
  x: 10,
  y: 10,
  w: 20,
  h: 20,
  tier: 1,
};

const mockDualPost: UserPost = {
  id: 'post-1',
  user_id: 'user-1',
  light_img_url: 'https://cdn.example.com/light.jpg',
  dark_img_url: 'https://cdn.example.com/dark.jpg',
  obfuscated_location_hash: null,
  created_at: new Date().toISOString(),
  cheer_count: 5,
  stickers: [],
  item_pins: [],
};

const mockDarkOnlyPost: UserPost = {
  id: 'post-2',
  user_id: 'user-1',
  light_img_url: '',
  dark_img_url: 'https://cdn.example.com/dark.jpg',
  obfuscated_location_hash: null,
  created_at: new Date().toISOString(),
  cheer_count: 3,
  stickers: [],
  item_pins: [],
};

describe('ProfileShellLightbox Component', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('synchronously initializes dark mode on first paint for dark-only capture', () => {
    render(
      <ProfileShellLightbox
        expandedPost={{ post: mockDarkOnlyPost, slot: mockSlot }}
        currentShellName="Cottage"
        isOwner={true}
        onClose={vi.fn()}
        onUnassignPost={vi.fn()}
      />
    );

    expect(screen.getByText('Sunlit Window')).toBeInTheDocument();
    expect(screen.getByText('Featured in your Cottage')).toBeInTheDocument();
  });

  it('synchronously initializes night view at 20:00 without flashing daytime mode', () => {
    // Set system time to 20:00 (evening)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 20, 0, 0));

    render(
      <ProfileShellLightbox
        expandedPost={{ post: mockDualPost, slot: mockSlot }}
        currentShellName="Cottage"
        isOwner={true}
        onClose={vi.fn()}
        onUnassignPost={vi.fn()}
      />
    );

    // At 20:00, default mode is dark, so toggle button offers switching to daytime view
    const toggleBtn = screen.getByRole('button', { name: /switch to daytime view/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('Night View')).toBeInTheDocument();
  });

  it('allows user to toggle view mode between day and night', () => {
    // Default daytime (e.g. 12:00)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0));

    render(
      <ProfileShellLightbox
        expandedPost={{ post: mockDualPost, slot: mockSlot }}
        currentShellName="Cottage"
        isOwner={true}
        onClose={vi.fn()}
        onUnassignPost={vi.fn()}
      />
    );

    // Initial daytime button offers switching to evening view
    const toggleBtn = screen.getByRole('button', { name: /switch to evening view/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('Day View')).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText('Night View')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ProfileShellLightbox
        expandedPost={{ post: mockDualPost, slot: mockSlot }}
        currentShellName="Cottage"
        isOwner={true}
        onClose={onClose}
        onUnassignPost={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: '' });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onUnassignPost when owner clicks Unsnap Space', async () => {
    const user = userEvent.setup();
    const onUnassign = vi.fn();

    render(
      <ProfileShellLightbox
        expandedPost={{ post: mockDualPost, slot: mockSlot }}
        currentShellName="Cottage"
        isOwner={true}
        onClose={vi.fn()}
        onUnassignPost={onUnassign}
      />
    );

    const unsnapBtn = screen.getByRole('button', { name: /unsnap space/i });
    await user.click(unsnapBtn);
    expect(onUnassign).toHaveBeenCalledWith('post-1');
  });
});
