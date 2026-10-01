import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationDrawer, sanitizeInternalUrl } from '@/components/NotificationDrawer';
import type { CozyNotificationItem } from '@/app/actions/notificationActions';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

  it('renders one-tap actions for Daily Tasks and Peer Care', () => {
    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        unreadCount={2}
      />
    );

    const uploadBtn = screen.getByRole('button', { name: /Upload Room/i });
    expect(uploadBtn).toBeInTheDocument();

    const groupLink = screen.getByRole('link', { name: /Jump to Group Map/i });
    expect(groupLink).toHaveAttribute('href', '/groups/grp-1');
  });

  it('navigates to /camera, marks item as read, and closes drawer when Upload Room is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockMarkRead = vi.fn();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkRead={mockMarkRead}
      />
    );

    const uploadButton = screen.getByRole('button', { name: /Upload Room/i });
    await user.click(uploadButton);

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/camera');
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

  it('closes drawer when explicit close button in header is clicked', async () => {
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /^Close notification drawer$/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toMatch(/min-w-\[44px\]/);
    expect(closeBtn.className).toMatch(/min-h-\[44px\]/);
    await user.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes drawer when mobile back button is clicked', async () => {
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Back to previous screen/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn.className).toMatch(/min-w-\[44px\]/);
    expect(backBtn.className).toMatch(/min-h-\[44px\]/);
    await user.click(backBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes drawer when backdrop is clicked', async () => {
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
      />
    );

    const backdrop = screen.getByRole('button', { name: /Close notification drawer backdrop/i });
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays "All caught up ✓" feedback and auto-dismisses after clicking Mark all read', async () => {
    const mockOnClose = vi.fn();
    const mockMarkAllRead = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkAllRead={mockMarkAllRead}
      />
    );

    const markAllButton = screen.getByRole('button', { name: /Mark all as read/i });
    await user.click(markAllButton);

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(screen.getByText('All caught up ✓')).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('auto-dismisses when the single remaining unread item is marked as read', async () => {
    const mockOnClose = vi.fn();
    const mockMarkRead = vi.fn();
    const user = userEvent.setup();

    const singleUnreadItem: CozyNotificationItem[] = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'daily_task',
        title: 'Only unread notification',
        message: 'Please complete your check-in.',
        metadata: {},
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={singleUnreadItem}
        unreadCount={1}
        onMarkRead={mockMarkRead}
      />
    );

    const markReadBtn = screen.getByRole('button', { name: /Mark read/i });
    await user.click(markReadBtn);

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(screen.getByText('All caught up ✓')).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not auto-dismiss when multiple unread notifications remain', async () => {
    const mockOnClose = vi.fn();
    const mockMarkRead = vi.fn();
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        unreadCount={3}
        onMarkRead={mockMarkRead}
      />
    );

    const markReadBtns = screen.getAllByRole('button', { name: /Mark read/i });
    await user.click(markReadBtns[0]);

    expect(mockMarkRead).toHaveBeenCalled();
    expect(screen.queryByText('All caught up ✓')).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('triggers Mark all read even when all loaded items are read but unreadCount > 0', async () => {
    const mockOnClose = vi.fn();
    const mockMarkAllRead = vi.fn();
    const user = userEvent.setup();

    const allReadItems: CozyNotificationItem[] = mockNotifications.map((n) => ({
      ...n,
      isRead: true,
    }));

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={allReadItems}
        unreadCount={5}
        onMarkAllRead={mockMarkAllRead}
      />
    );

    const markAllButton = screen.getByRole('button', { name: /Mark all as read/i });
    await user.click(markAllButton);

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(screen.getByText('All caught up ✓')).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error banner and does not dismiss drawer when markAllRead fails', async () => {
    const mockOnClose = vi.fn();
    const mockMarkAllRead = vi.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        unreadCount={2}
        onMarkAllRead={mockMarkAllRead}
      />
    );

    const markAllButton = screen.getByRole('button', { name: /Mark all as read/i });
    await user.click(markAllButton);

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(await screen.findByText('Network error')).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders neutral Completed indicator when daily_task notification metadata indicates completion', () => {
    const completedNotification: CozyNotificationItem = {
      id: 'n-completed-1',
      userId: 'u1',
      type: 'daily_task',
      title: 'Daily Space Reset',
      message: 'Time for your daily space reset! Capture your Light & Dark room.',
      metadata: { action_url: '/camera', status: 'completed' },
      isRead: true,
      createdAt: new Date().toISOString(),
    };

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={[completedNotification]}
        unreadCount={0}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload Room/i })).not.toBeInTheDocument();
  });

  it('sanitizes external, protocol-relative, and malicious URLs on daily task CTA click', async () => {
    const user = userEvent.setup();
    const maliciousNotification: CozyNotificationItem = {
      id: 'n-malicious-1',
      userId: 'u1',
      type: 'daily_task',
      title: 'Phishing Daily Reset',
      message: 'Click here to capture',
      metadata: { action_url: 'https://evil.example.com/exploit' },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={[maliciousNotification]}
        unreadCount={1}
      />
    );

    const ctaButton = screen.getByRole('button', { name: /Upload Room/i });
    await user.click(ctaButton);

    // Unsafe external link must be discarded and replaced with safe fallback '/camera'
    expect(mockPush).toHaveBeenCalledWith('/camera');
  });

  it('navigates to legitimate internal paths when valid action_url is provided', async () => {
    const user = userEvent.setup();
    const legitimateNotification: CozyNotificationItem = {
      id: 'n-valid-1',
      userId: 'u1',
      type: 'daily_task',
      title: 'Valid Daily Reset',
      message: 'Click here to capture',
      metadata: { action_url: '/camera?mode=dark' },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    render(
      <NotificationDrawer
        isOpen={true}
        onClose={vi.fn()}
        notifications={[legitimateNotification]}
        unreadCount={1}
      />
    );

    const ctaButton = screen.getByRole('button', { name: /Upload Room/i });
    await user.click(ctaButton);

    expect(mockPush).toHaveBeenCalledWith('/camera?mode=dark');
  });

  it('rejects encoded separator bypass attempts (%2f, %5c, double encoded)', () => {
    expect(sanitizeInternalUrl('/%2fevil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('/%2Fevil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('/%252fevil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('/%5cevil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('/%5Cevil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('/\\evil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('//evil.com')).toBe('/camera');
    expect(sanitizeInternalUrl('javascript:alert(1)')).toBe('/camera');
    expect(sanitizeInternalUrl('/camera')).toBe('/camera');
    expect(sanitizeInternalUrl('/camera?mode=dark#room')).toBe('/camera?mode=dark#room');
  });
});
