import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileShell } from '@/components/ProfileShell';
import type { UserPost } from '@/store/useCozyStore';

vi.mock('@/app/actions/shellActions', () => ({
  updateUserShell: vi.fn().mockResolvedValue({ success: true }),
  assignPostToSlot: vi.fn().mockResolvedValue({ success: true }),
  removePostFromSlot: vi.fn().mockResolvedValue({ success: true }),
  redeemExpansionToken: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('ProfileShell Assign Space Modal', () => {
  it('renders "Create a New Space" button linking to /camera when all spaces are assigned', async () => {
    const user = userEvent.setup();
    // User has 1 post and it is already assigned to 'room_top_left' (Cozy Corner)
    const posts: UserPost[] = [
      {
        id: 'post_1',
        user_id: 'user_1',
        light_img_url: 'https://example.com/light.jpg',
        dark_img_url: 'https://example.com/dark.jpg',
        obfuscated_location_hash: null,
        cheer_count: 5,
        stickers: [],
        item_pins: [],
        created_at: new Date().toISOString(),
        shell_slot: 'room_top_left',
      },
    ];

    render(
      <ProfileShell
        initialShellType="default_dollhouse"
        initialExpansionTier={2}
        initialMilestoneTokens={0}
        themesUnlocked={false}
        posts={posts}
        isOwner={true}
      />
    );

    // Find the empty Sunroom Studio slot button and click it to open the assign modal
    const sunroomSpot = screen.getByTitle(/Snap a space to Sunroom Studio/i);
    expect(sunroomSpot).toBeInTheDocument();
    await user.click(sunroomSpot);

    // Modal should show "All your spaces are already assigned!" message
    expect(await screen.findByText(/All your spaces are already assigned!/i)).toBeInTheDocument();

    // Verify "Create a New Space" button is present and links to /camera
    const createSpaceLink = await screen.findByRole('link', { name: /Create a New Space/i });
    expect(createSpaceLink).toBeInTheDocument();
    expect(createSpaceLink).toHaveAttribute('href', '/camera');
  });

  it('renders "Create New Space" card tile and quick action button when unassigned posts exist', async () => {
    const user = userEvent.setup();
    // User has 1 unassigned post (shell_slot is null)
    const posts: UserPost[] = [
      {
        id: 'post_unassigned',
        user_id: 'user_1',
        light_img_url: 'https://example.com/light.jpg',
        dark_img_url: 'https://example.com/dark.jpg',
        obfuscated_location_hash: null,
        cheer_count: 3,
        stickers: [],
        item_pins: [],
        created_at: new Date().toISOString(),
        shell_slot: null,
      },
    ];

    render(
      <ProfileShell
        initialShellType="default_dollhouse"
        initialExpansionTier={2}
        initialMilestoneTokens={0}
        themesUnlocked={false}
        posts={posts}
        isOwner={true}
      />
    );

    // Open assign modal for Cozy Corner
    const cozyCornerSpot = screen.getByTitle(/Snap a space to Cozy Corner/i);
    await user.click(cozyCornerSpot);

    // The unassigned post card with "Place" should be in the document
    expect(await screen.findByText(/Place/i)).toBeInTheDocument();

    // The "+ Create New Space" card tile should be present and link to /camera
    const createCard = screen.getByRole('link', { name: /Create New Space/i });
    expect(createCard).toBeInTheDocument();
    expect(createCard).toHaveAttribute('href', '/camera');

    // The footer quick action button "Snap New Space" should also be present
    const footerButton = screen.getByRole('link', { name: /Snap New Space/i });
    expect(footerButton).toBeInTheDocument();
    expect(footerButton).toHaveAttribute('href', '/camera');
  });
});
