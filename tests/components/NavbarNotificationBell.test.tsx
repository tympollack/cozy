import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavbarNotificationBell } from '@/components/NavbarNotificationBell';

const mockGetUserNotifications = vi.fn();
const mockMarkNotificationAsRead = vi.fn();
const mockTriggerDailyTaskNudge = vi.fn();

vi.mock('@/app/actions/notificationActions', () => ({
  getUserNotifications: (...args: unknown[]) => mockGetUserNotifications(...args),
  markNotificationAsRead: (...args: unknown[]) => mockMarkNotificationAsRead(...args),
  triggerDailyTaskNudge: (...args: unknown[]) => mockTriggerDailyTaskNudge(...args),
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase-browser', () => ({
  createBrowserClient: () => ({
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

describe('NavbarNotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTriggerDailyTaskNudge.mockResolvedValue({
      success: true,
      nudged: true,
      targetPhase: 'light',
    });
    mockGetUserNotifications.mockResolvedValue({
      success: true,
      notifications: [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'daily_task',
          title: 'Daily Space Reset',
          message: 'Time for your daily space reset!',
          metadata: { action_url: '/camera' },
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });
  });

  it('renders bell button, triggers daily task check-in nudge and fetches initial notifications', async () => {
    render(<NavbarNotificationBell userId="user-1" initialUnreadCount={1} />);

    const button = screen.getByRole('button', { name: /Open notifications/i });
    expect(button).toBeInTheDocument();

    await waitFor(() => {
      expect(mockTriggerDailyTaskNudge).toHaveBeenCalled();
      expect(mockGetUserNotifications).toHaveBeenCalled();
    });
  });

  it('opens notification drawer on button click', async () => {
    const user = userEvent.setup();
    render(<NavbarNotificationBell userId="user-1" initialUnreadCount={1} />);

    const button = screen.getByRole('button', { name: /Open notifications/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Daily Space Reset')).toBeInTheDocument();
    });
  });
});
