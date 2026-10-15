import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimHouseModal } from '@/components/ClaimHouseModal';
import { useCozyStore } from '@/store/useCozyStore';
import { claimPlotOneTap } from '@/app/actions/claimActions';
import { joinGroup } from '@/app/actions/groupActions';

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

  it('calls onClose when close button or footer close button is clicked while idle', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ClaimHouseModal postId="post-123" onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Close claim modal');
    expect(closeBtn).not.toBeDisabled();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks hardware back and close controls while claim is pending', async () => {
    let resolveClaim!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveClaim = resolve;
    });
    vi.mocked(claimPlotOneTap).mockReturnValueOnce(pendingPromise as ReturnType<typeof claimPlotOneTap>);

    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ClaimHouseModal postId="post-123" onClose={onClose} />);

    const claimBtn = screen.getByRole('button', { name: /Claim Space Plot Now/i });
    await user.click(claimBtn);

    const closeHeaderBtn = screen.getByLabelText('Close claim modal');
    const closeFooterBtn = screen.getByRole('button', { name: /^Close$/i });

    expect(closeHeaderBtn).toBeDisabled();
    expect(closeFooterBtn).toBeDisabled();

    // Hardware back button triggered
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).not.toHaveBeenCalled();

    // Clicking disabled button should not call onClose
    await user.click(closeHeaderBtn);
    expect(onClose).not.toHaveBeenCalled();

    // Resolve claim
    resolveClaim({
      success: true,
      postId: 'post-123',
      claimedBy: 'user-abc',
      message: '✨ Plot claimed successfully!',
    });

    await waitFor(() => {
      expect(screen.getByText(/Plot claimed successfully!/i)).toBeInTheDocument();
    });

    expect(closeHeaderBtn).not.toBeDisabled();
  });

  it('blocks hardware back and close controls while joining a village', async () => {
    let resolveJoin!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveJoin = resolve;
    });
    vi.mocked(joinGroup).mockReturnValueOnce(pendingPromise as ReturnType<typeof joinGroup>);

    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ClaimHouseModal postId="post-123" onClose={onClose} />);

    const villageTabBtn = screen.getByRole('button', { name: /Village Matching/i });
    await user.click(villageTabBtn);

    expect(await screen.findByText('Sunlit Glade')).toBeInTheDocument();
    const joinBtns = screen.getAllByRole('button', { name: /^Join$/i });
    await user.click(joinBtns[0]);

    const closeHeaderBtn = screen.getByLabelText('Close claim modal');
    expect(closeHeaderBtn).toBeDisabled();

    // Hardware back button triggered
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).not.toHaveBeenCalled();

    resolveJoin({ success: true, groupId: 'group-uuid-456' });

    await waitFor(() => {
      expect(screen.getByText(/You joined Sunlit Glade!/i)).toBeInTheDocument();
    });

    expect(closeHeaderBtn).not.toBeDisabled();
  });
});
