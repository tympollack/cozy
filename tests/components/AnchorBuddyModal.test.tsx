import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnchorBuddyModal } from '@/components/AnchorBuddyModal';
import type { GroupPeer } from '@/app/actions/vibeActions';

const mockSetRaincloudCascade = vi.fn();
vi.mock('@/app/actions/waterfallActions', () => ({
  setRaincloudCascade: (...args: unknown[]) => mockSetRaincloudCascade(...args),
}));

describe('AnchorBuddyModal Component', () => {
  const peers: GroupPeer[] = [
    { userId: 'peer-1', displayName: 'Maya Anchor' },
    { userId: 'peer-2', displayName: 'Sam Neighbor' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders anchor buddy options and protection explanation', () => {
    render(<AnchorBuddyModal peers={peers} onClose={vi.fn()} />);

    expect(screen.getByText('Raincloud Status')).toBeInTheDocument();
    expect(screen.getByText('Protecting Your Peace')).toBeInTheDocument();
    expect(screen.getByText('Maya Anchor')).toBeInTheDocument();
    expect(screen.getByText('Sam Neighbor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call 988/i })).toHaveAttribute('href', 'tel:988');
  });

  it('allows selecting an anchor buddy and activating the Serene Cascade', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    mockSetRaincloudCascade.mockResolvedValue({
      success: true,
      message: 'Quiet check-in sent to Sam Neighbor.',
    });

    render(<AnchorBuddyModal peers={peers} onClose={onClose} onSuccess={onSuccess} />);

    // Select second peer
    const samOption = screen.getByRole('button', { name: /Sam Neighbor/i });
    await user.click(samOption);

    const activateButton = screen.getByRole('button', { name: /Activate Quiet Raincloud Status/i });
    await user.click(activateButton);

    expect(mockSetRaincloudCascade).toHaveBeenCalledWith('peer-2');
    expect(onSuccess).toHaveBeenCalledWith('Quiet check-in sent to Sam Neighbor.');
    expect(onClose).toHaveBeenCalled();
  });
});
