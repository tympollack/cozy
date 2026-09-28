import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimHouseModal } from '@/components/ClaimHouseModal';
import { useCozyStore } from '@/store/useCozyStore';

vi.mock('@/app/actions/claimActions', () => ({
  claimPlotOneTap: vi.fn().mockResolvedValue({
    success: true,
    postId: 'post-123',
    claimedBy: 'user-abc',
    message: '✨ Plot claimed successfully!',
  }),
  getVillageSuggestions: vi.fn().mockResolvedValue([
    {
      id: 'village-1',
      name: 'Sunlit Glade',
      emoji: '☀️',
      type: 'village',
      memberCount: 12,
      vibeMatch: 'sunshine',
      description: 'Warm morning light community',
      inviteCode: 'sunlit-glade',
    },
    {
      id: 'village-2',
      name: 'Cinnamon Commons',
      emoji: '☕',
      type: 'village',
      memberCount: 8,
      vibeMatch: 'neutral',
      description: 'Cozy hearth for gentle resets',
      inviteCode: 'cinnamon-commons',
    },
  ]),
  verifyProximity: vi.fn().mockResolvedValue({ success: true }),
  submitInteriorProof: vi.fn().mockResolvedValue({ success: true }),
  triggerPostcard: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/actions/groupActions', () => ({
  joinGroup: vi.fn().mockImplementation(async (code: string) => {
    if (code === 'invalid') {
      return { success: false, error: 'Invalid invite code.' };
    }
    return { success: true, groupId: 'group-uuid-456' };
  }),
}));

describe('ClaimHouseModal Component (TASK-COZY-ONBOARD-CLAIM)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      vibeStatus: 'sunshine',
      groupId: null,
    });
  });

  it('renders one-tap plot claim view by default', () => {
    render(<ClaimHouseModal postId="post-123" onClose={vi.fn()} />);

    expect(screen.getByText('Claim Your Space Plot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Claim Space Plot Now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Village Matching/i })).toBeInTheDocument();
  });

  it('executes one-tap plot claim successfully', async () => {
    const user = userEvent.setup();
    const onClaimSuccess = vi.fn();
    render(
      <ClaimHouseModal
        postId="post-123"
        onClose={vi.fn()}
        onClaimSuccess={onClaimSuccess}
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Claim Space Plot Now/i });
    await user.click(claimBtn);

    expect(screen.getByText(/Plot claimed successfully!/i)).toBeInTheDocument();
    expect(onClaimSuccess).toHaveBeenCalled();
  });

  it('switches to village matching tab, loads suggestions, and joins village', async () => {
    const user = userEvent.setup();
    render(<ClaimHouseModal postId="post-123" onClose={vi.fn()} />);

    const villageTabBtn = screen.getByRole('button', { name: /Village Matching/i });
    await user.click(villageTabBtn);

    expect(await screen.findByText('Sunlit Glade')).toBeInTheDocument();
    expect(screen.getByText('Cinnamon Commons')).toBeInTheDocument();

    // Click join button on Sunlit Glade
    const joinBtns = screen.getAllByRole('button', { name: /^Join$/i });
    await user.click(joinBtns[0]);

    expect(await screen.findByText(/You joined Sunlit Glade!/i)).toBeInTheDocument();
    expect(useCozyStore.getState().groupId).toBe('group-uuid-456');
  });

  it('allows joining village with custom invite code', async () => {
    const user = userEvent.setup();
    render(<ClaimHouseModal postId="post-123" onClose={vi.fn()} />);

    const villageTabBtn = screen.getByRole('button', { name: /Village Matching/i });
    await user.click(villageTabBtn);

    const input = screen.getByPlaceholderText('e.g. cozy-glade');
    await user.type(input, 'my-private-village');

    const submitBtn = screen.getByRole('button', { name: /Join with Code/i });
    await user.click(submitBtn);
    expect(await screen.findByText(/You joined Custom Neighborhood!/i)).toBeInTheDocument();
  });

  it('allows switching to optional postal/GPS verification tab', async () => {
    const user = userEvent.setup();
    render(<ClaimHouseModal postId="post-123" onClose={vi.fn()} />);

    const postalToggle = screen.getByRole('button', {
      name: /Physical Postal \/ GPS Verification/i,
    });
    await user.click(postalToggle);

    expect(screen.getByText('GPS Verification')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Location/i })).toBeInTheDocument();
  });
});
