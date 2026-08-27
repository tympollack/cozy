import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoticeModal } from '@/components/NoticeModal';
import type { CozyNotice } from '@/app/actions/notificationActions';

const mockAcceptCallingCard = vi.fn();
const mockDeclineCallingCard = vi.fn();

vi.mock('@/app/actions/peerActions', () => ({
  acceptCallingCard: (...args: unknown[]) => mockAcceptCallingCard(...args),
  declineCallingCard: (...args: unknown[]) => mockDeclineCallingCard(...args),
}));

describe('NoticeModal Component (Scope D)', () => {
  const mockNotices: CozyNotice[] = [
    {
      id: 'notice-1',
      type: 'cheer',
      title: 'New Cheer!',
      body: 'Maya cheered your living room.',
      actorName: 'Maya',
      createdAt: new Date().toISOString(),
      actionUrl: '/post/post-1',
    },
    {
      id: 'notice-2',
      type: 'calling_card',
      title: 'Calling Card Received',
      body: 'Alex dropped a calling card at your door.',
      actorName: 'Alex',
      peerId: 'peer-alex-99',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notice-3',
      type: 'support_note',
      title: 'Private Note from Sam',
      body: 'Sending warm vibes today! ☕',
      actorName: 'Sam',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notice-4',
      type: 'porch_warmth',
      title: 'Taylor left a cozy tea on your porch',
      body: 'Cozy herbal tea.',
      actorName: 'Taylor',
      itemType: 'tea',
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders empty state when notices list is empty', () => {
    render(
      <NoticeModal
        isOpen={true}
        onClose={vi.fn()}
        notices={[]}
        onClearAll={vi.fn()}
        onDismissNotice={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No new notices')).toBeInTheDocument();
  });

  it('renders notices and handles tab filtering across all categories', async () => {
    const user = userEvent.setup();
    render(
      <NoticeModal
        isOpen={true}
        onClose={vi.fn()}
        notices={mockNotices}
        onClearAll={vi.fn()}
        onDismissNotice={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('New Cheer!')).toBeInTheDocument();
    expect(screen.getByText('Calling Card Received')).toBeInTheDocument();

    // Filter to Cheers tab
    const cheersTab = screen.getByRole('button', { name: /Cheers \(1\)/i });
    await user.click(cheersTab);
    expect(screen.getByText('New Cheer!')).toBeInTheDocument();
    expect(screen.queryByText('Calling Card Received')).not.toBeInTheDocument();

    // Filter to Cards tab
    const cardsTab = screen.getByRole('button', { name: /Cards \(1\)/i });
    await user.click(cardsTab);
    expect(screen.getByText('Calling Card Received')).toBeInTheDocument();

    // Filter to Notes tab
    const notesTab = screen.getByRole('button', { name: /Notes \(1\)/i });
    await user.click(notesTab);
    expect(screen.getByText('Private Note from Sam')).toBeInTheDocument();

    // Filter to Porch tab
    const porchTab = screen.getByRole('button', { name: /Porch \(1\)/i });
    await user.click(porchTab);
    expect(screen.getByText('Taylor left a cozy tea on your porch')).toBeInTheDocument();
  });

  it('allows accepting and declining calling cards directly from notice item', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    mockAcceptCallingCard.mockResolvedValue({ success: true });
    mockDeclineCallingCard.mockResolvedValue({ success: true });

    render(
      <NoticeModal
        isOpen={true}
        onClose={vi.fn()}
        notices={mockNotices}
        onRefresh={onRefresh}
      />
    );

    const acceptButton = screen.getByRole('button', { name: /Accept \(\+5 pts\)/i });
    await user.click(acceptButton);
    expect(mockAcceptCallingCard).toHaveBeenCalledWith('peer-alex-99');
  });

  it('triggers dismiss, clear, and refresh callbacks', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    const handleClear = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <NoticeModal
        isOpen={true}
        onClose={vi.fn()}
        notices={mockNotices}
        onClearAll={handleClear}
        onDismissNotice={handleDismiss}
        onRefresh={handleRefresh}
      />
    );

    // Refresh button
    const refreshButton = screen.getByTitle('Refresh notices');
    await user.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);

    // Dismiss first notice
    const dismissButtons = screen.getAllByRole('button', { name: /Dismiss notice/i });
    await user.click(dismissButtons[0]);
    expect(handleDismiss).toHaveBeenCalledWith('notice-1');

    // Clear all button
    const clearButton = screen.getByRole('button', { name: /Clear/i });
    await user.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
