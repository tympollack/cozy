import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import type { CozyNotificationItem } from '@/app/actions/notificationActions';

const mockNotifications: CozyNotificationItem[] = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'daily_task',
    title: 'Daily Space Reset',
    message: 'Time for your daily space reset! Capture your Light & Dark room.',
    metadata: { action_url: '/camera' },
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'peer_checkin',
    title: '🌧️ Raincloud Check-In',
    message: 'Alice is sitting under a raincloud. Take a moment to send warmth.',
    metadata: { group_id: 'grp-1', peer_id: 'alice' },
    isRead: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3',
    userId: 'u1',
    type: 'admin_broadcast',
    title: '🍂 Ecosystem Maintenance',
    message: 'Admin gateway broadcast: system update at midnight.',
    metadata: { broadcast_id: 'b-1' },
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

describe('NotificationDrawer Component', () => {
  it('renders all notifications and unread badge when open', () => {
    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
    expect(screen.getByText('Daily Space Reset')).toBeInTheDocument();
    expect(screen.getByText('🌧️ Raincloud Check-In')).toBeInTheDocument();
    expect(screen.getByText('🍂 Ecosystem Maintenance')).toBeInTheDocument();
  });

  it('filters notifications by tab (Daily Tasks, Peer Care, System Broadcasts)', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    // Click Daily Tasks tab
    const dailyTab = screen.getByRole('button', { name: /Daily Tasks/i });
    await user.click(dailyTab);

    expect(screen.getByText('Daily Space Reset')).toBeInTheDocument();
    expect(screen.queryByText('🌧️ Raincloud Check-In')).not.toBeInTheDocument();
    expect(screen.queryByText('🍂 Ecosystem Maintenance')).not.toBeInTheDocument();

    // Click Peer Care tab
    const peerTab = screen.getByRole('button', { name: /Peer Care/i });
    await user.click(peerTab);

    expect(screen.queryByText('Daily Space Reset')).not.toBeInTheDocument();
    expect(screen.getByText('🌧️ Raincloud Check-In')).toBeInTheDocument();

    // Click System Broadcasts tab
    const broadcastTab = screen.getByRole('button', { name: /System Broadcasts/i });
    await user.click(broadcastTab);

    expect(screen.getByText('🍂 Ecosystem Maintenance')).toBeInTheDocument();
  });

  it('renders one-tap action links for Daily Tasks and Peer Care', () => {
    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    const uploadLink = screen.getByRole('link', { name: /Upload Room/i });
    expect(uploadLink).toHaveAttribute('href', '/camera');

    const groupLink = screen.getByRole('link', { name: /Jump to Group Map/i });
    expect(groupLink).toHaveAttribute('href', '/groups/grp-1');
  });

  it('calls onMarkRead when Mark read is clicked', async () => {
    const mockMarkRead = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkRead={mockMarkRead}
      />
    );

    const markReadButtons = screen.getAllByRole('button', { name: /Mark read/i });
    expect(markReadButtons.length).toBeGreaterThan(0);
    await user.click(markReadButtons[0]);

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
  });

  it('calls onMarkAllRead when Mark all read is clicked', async () => {
    const mockMarkAllRead = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkAllRead={mockMarkAllRead}
      />
    );

    const markAllButton = screen.getByRole('button', { name: /Mark all as read/i });
    await user.click(markAllButton);

    expect(mockMarkAllRead).toHaveBeenCalled();
  });
});
