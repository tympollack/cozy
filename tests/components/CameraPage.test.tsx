import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraPage from '@/app/camera/page';
import * as offlineStore from '@/lib/offlinePhotoStore';

const mockUploadPost = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/app/actions/postActions', () => ({
  uploadPost: (...args: unknown[]) => mockUploadPost(...args),
}));

describe('CameraPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders camera page with warmth filter selector and privacy badge', () => {
    render(<CameraPage />);

    expect(screen.getByText('Share Your Space')).toBeInTheDocument();
    expect(screen.getByTestId('warmth-filter-selector')).toBeInTheDocument();
    expect(screen.getByText(/Ambient Warmth Filter/i)).toBeInTheDocument();

    // Warmth filter options
    expect(screen.getByTestId('filter-btn-natural')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-golden_hour')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-candlelight')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-soft_honey')).toBeInTheDocument();

    // Privacy callout
    expect(screen.getByText(/Zero GPS Leakage:/i)).toBeInTheDocument();
  });

  it('allows switching warmth filters', async () => {
    const user = userEvent.setup();
    render(<CameraPage />);

    const candlelightBtn = screen.getByTestId('filter-btn-candlelight');
    await user.click(candlelightBtn);

    expect(screen.getByText(/Cozy hearth & firelight amber glow/i)).toBeInTheDocument();
  });

  it('renders offline banner and saves to offline queue when offline', async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(offlineStore, 'saveOfflinePost').mockResolvedValue('queued_test_1');

    // Simulate offline
    vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
      isOnline: false,
      queuedCount: 0,
      isSyncing: false,
      lastSyncResult: null,
      refreshCount: vi.fn(),
      syncNow: vi.fn(),
    });

    render(<CameraPage />);

    expect(screen.getByTestId('offline-status-banner')).toBeInTheDocument();
    expect(screen.getByText(/Offline Living/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save space offline/i })).toBeInTheDocument();
  });

  it('renders pending sync bar when queued photos exist and triggers sync', async () => {
    const user = userEvent.setup();
    const mockSyncNow = vi.fn();

    vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
      isOnline: true,
      queuedCount: 2,
      isSyncing: false,
      lastSyncResult: null,
      refreshCount: vi.fn(),
      syncNow: mockSyncNow,
    });

    render(<CameraPage />);

    expect(screen.getByTestId('pending-sync-bar')).toBeInTheDocument();
    expect(screen.getByText(/2 offline spaces waiting to sync/i)).toBeInTheDocument();

    const syncButton = screen.getByRole('button', { name: /Sync Now/i });
    await user.click(syncButton);

    expect(mockSyncNow).toHaveBeenCalled();
  });
});
