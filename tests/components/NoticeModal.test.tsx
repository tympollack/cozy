import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoticeModal } from '@/components/NoticeModal';
import type { CozyNotice } from '@/app/actions/notificationActions';

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

  it('renders notices and handles tab filtering', async () => {
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
  });

  it('triggers dismiss and clear callbacks when buttons are clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    const handleClear = vi.fn();

    render(
      <NoticeModal
        isOpen={true}
        onClose={vi.fn()}
        notices={mockNotices}
        onClearAll={handleClear}
        onDismissNotice={handleDismiss}
        onRefresh={vi.fn()}
      />
    );

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
