import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CircadianPushOptIn } from '@/components/CircadianPushOptIn';
import * as webPush from '@/lib/webPush';
import * as notifActions from '@/app/actions/notificationActions';

vi.mock('@/lib/webPush', () => ({
  isPushSupported: vi.fn(),
  getPushNotificationPermission: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  getActivePushSubscription: vi.fn(),
}));

vi.mock('@/app/actions/notificationActions', () => ({
  savePushSubscriptionAction: vi.fn(),
  deletePushSubscriptionAction: vi.fn(),
}));

describe('CircadianPushOptIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when web push is unsupported in the browser', () => {
    vi.mocked(webPush.isPushSupported).mockReturnValue(false);
    const { container } = render(<CircadianPushOptIn />);
    expect(container.firstChild).toBeNull();
  });

  it('renders card variant with privacy guarantee and enable button when supported', async () => {
    vi.mocked(webPush.isPushSupported).mockReturnValue(true);
    vi.mocked(webPush.getPushNotificationPermission).mockReturnValue('default');
    vi.mocked(webPush.getActivePushSubscription).mockResolvedValue(null);

    render(<CircadianPushOptIn variant="card" />);

    await waitFor(() => {
      expect(screen.getByText('Gentle Circadian Nudges')).toBeInTheDocument();
      expect(screen.getByText(/Zero spam, zero streak guilt/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument();
    });
  });

  it('handles successful push subscription and displays confirmation', async () => {
    vi.mocked(webPush.isPushSupported).mockReturnValue(true);
    vi.mocked(webPush.getPushNotificationPermission).mockReturnValue('default');
    vi.mocked(webPush.getActivePushSubscription).mockResolvedValue(null);
    vi.mocked(webPush.subscribeToPush).mockResolvedValue({
      success: true,
      subscription: { endpoint: 'https://push.service/123' },
    });
    vi.mocked(notifActions.savePushSubscriptionAction).mockResolvedValue({
      success: true,
    });

    render(<CircadianPushOptIn variant="card" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /enable/i }));

    await waitFor(() => {
      expect(webPush.subscribeToPush).toHaveBeenCalled();
      expect(notifActions.savePushSubscriptionAction).toHaveBeenCalled();
      expect(screen.getByText('Nudges Enabled')).toBeInTheDocument();
    });



  });

  it('renders settings variant with pause button when already subscribed', async () => {
    vi.mocked(webPush.isPushSupported).mockReturnValue(true);
    vi.mocked(webPush.getPushNotificationPermission).mockReturnValue('granted');
    vi.mocked(webPush.getActivePushSubscription).mockResolvedValue({
      endpoint: 'https://push.service/123',
    } as any);

    render(<CircadianPushOptIn variant="settings" />);

    await waitFor(() => {
      expect(screen.getByText(/Circadian Web Push Nudges/i)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pause Nudges/i })).toBeInTheDocument();
    });
  });
});
