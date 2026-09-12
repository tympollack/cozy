import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityBulletinBoard } from '@/components/CommunityBulletinBoard';
import { useCozyStore } from '@/store/useCozyStore';

const mockCompleteGroupChallenge = vi.fn();
const mockCreateGroupChallenge = vi.fn();

vi.mock('@/app/actions/challengeActions', () => ({
  completeGroupChallenge: (...args: unknown[]) => mockCompleteGroupChallenge(...args),
  createGroupChallenge: (...args: unknown[]) => mockCreateGroupChallenge(...args),
}));

describe('CommunityBulletinBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({
      points: 50,
      groupPoints: 350,
    });
  });

  it('renders Town Square Bulletin Board with theme unlock progress and challenges', () => {
    render(
      <CommunityBulletinBoard
        groupId="group-1"
        isAdmin={false}
      />
    );

    expect(screen.getByText('Town Square Bulletin Board')).toBeInTheDocument();
    expect(screen.getByText(/Theme Unlock Progress:/i)).toBeInTheDocument();
    expect(screen.getByText(/Campsite Theme/i)).toBeInTheDocument();
    expect(screen.getByText('350 / 500 pts')).toBeInTheDocument();
  });

  it('allows members to complete a challenge and updates points and status', async () => {
    const user = userEvent.setup();
    mockCompleteGroupChallenge.mockResolvedValue({
      success: true,
      newPersonalPoints: 65,
      newGroupPoints: 390,
    });

    render(
      <CommunityBulletinBoard
        groupId="group-1"
        isAdmin={false}
      />
    );

    const completeButtons = screen.getAllByRole('button', { name: /Complete Challenge/i });
    expect(completeButtons.length).toBeGreaterThan(0);

    await user.click(completeButtons[0]);

    expect(mockCompleteGroupChallenge).toHaveBeenCalled();
    expect(await screen.findByText(/Completed/i)).toBeInTheDocument();
    expect(useCozyStore.getState().points).toBe(65);
    expect(useCozyStore.getState().groupPoints).toBe(390);
  });

  it('allows admins to open modal and pin a weekly challenge', async () => {
    const user = userEvent.setup();
    mockCreateGroupChallenge.mockResolvedValue({ success: true });

    render(
      <CommunityBulletinBoard
        groupId="group-1"
        isAdmin={true}
      />
    );

    const pinButton = screen.getByRole('button', { name: /Pin Challenge/i });
    await user.click(pinButton);

    expect(screen.getByText('Pin Weekly Challenge')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Clean & organize kitchen shelf/i);
    const descInput = screen.getByPlaceholderText(/Describe the therapeutic cleaning/i);

    await user.type(titleInput, 'Plant Herb Garden 🌿');
    await user.type(descInput, 'Plant basil and mint for fresh tea.');

    const submitPin = screen.getByRole('button', { name: /Pin Challenge to Town Square/i });
    await user.click(submitPin);

    expect(mockCreateGroupChallenge).toHaveBeenCalledWith(
      'group-1',
      'Plant Herb Garden 🌿',
      'Plant basil and mint for fresh tea.',
      1.5
    );

    expect(await screen.findByText('Plant Herb Garden 🌿')).toBeInTheDocument();
  });

  it('renders max themes unlocked without NaN when group points reach or exceed 10000', () => {
    render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={10500}
        isAdmin={false}
      />
    );

    expect(screen.getByText(/All Themes Unlocked!/i)).toBeInTheDocument();
    expect(screen.getByText(/10,500 pts \(Max Tier\)/i)).toBeInTheDocument();
  });

  it('rolls back optimistic points and completed state when challenge completion fails', async () => {
    const user = userEvent.setup();
    mockCompleteGroupChallenge.mockResolvedValue({
      success: false,
      error: 'Challenge already completed by user.',
    });

    render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={350}
        isAdmin={false}
      />
    );

    const completeButtons = screen.getAllByRole('button', { name: /Complete Challenge/i });
    await user.click(completeButtons[0]);

    expect(mockCompleteGroupChallenge).toHaveBeenCalled();
    // After rejection, rollback ensures button still available and points reverted
    expect(screen.getAllByRole('button', { name: /Complete Challenge/i })[0]).toBeInTheDocument();
    expect(useCozyStore.getState().points).toBe(50);
  });

  it('reactively updates theme unlock progress display when completing challenge with initial groupPooledPoints prop', async () => {
    const user = userEvent.setup();
    mockCompleteGroupChallenge.mockResolvedValue({
      success: true,
      newPersonalPoints: 65,
      newGroupPoints: 475,
    });

    render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={400}
        isAdmin={false}
      />
    );

    expect(screen.getByText('400 / 500 pts')).toBeInTheDocument();

    const completeButtons = screen.getAllByRole('button', { name: /Complete Challenge/i });
    await user.click(completeButtons[0]);

    // Authoritative newGroupPoints updates the display from 400 -> 475
    expect(await screen.findByText('475 / 500 pts')).toBeInTheDocument();
  });

  it('[REV-COZY-01] resets prevGroupPooledPointsRef on undefined returns so points update when prop returns to previous value', () => {
    useCozyStore.setState({ groupPoints: 200 });

    const { rerender } = render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={350}
        isAdmin={false}
      />
    );

    expect(screen.getByText('350 / 500 pts')).toBeInTheDocument();

    // 1. groupPooledPoints transitions to undefined (falls back to store's 200)
    rerender(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={undefined}
        isAdmin={false}
      />
    );

    expect(screen.getByText('200 / 500 pts')).toBeInTheDocument();

    // 2. groupPooledPoints returns to 350. Because ref was reset on undefined, it must update back to 350.
    rerender(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={350}
        isAdmin={false}
      />
    );

    expect(screen.getByText('350 / 500 pts')).toBeInTheDocument();
  });

  it('[REV-COZY-02] incorporates groupId into change detection ref to detect switching between groups with identical points', async () => {
    const user = userEvent.setup();
    mockCreateGroupChallenge.mockResolvedValue({ success: true });

    const { rerender } = render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={500}
        isAdmin={true}
      />
    );

    expect(screen.getByText('500 / 1,200 pts')).toBeInTheDocument();

    // Complete a challenge in group-1 to test completedIds reset
    mockCompleteGroupChallenge.mockResolvedValueOnce({
      success: true,
      newPersonalPoints: 65,
      newGroupPoints: 538,
    });
    const completeBtns = screen.getAllByRole('button', { name: /Complete Challenge/i });
    await user.click(completeBtns[0]);
    expect(await screen.findByText(/Completed/i)).toBeInTheDocument();

    // Switch to group-2 which happens to have the exact same initial pooled points (500)
    rerender(
      <CommunityBulletinBoard
        groupId="group-2"
        groupPooledPoints={500}
        isAdmin={true}
      />
    );

    // Should re-initialize local points to 500 and reset completed state
    expect(screen.getByText('500 / 1,200 pts')).toBeInTheDocument();

    // Challenge button in group-2 should be active/uncompleted
    const newCompleteBtns = screen.getAllByRole('button', { name: /Complete Challenge/i });
    expect(newCompleteBtns.length).toBeGreaterThan(0);

    // Pinning a challenge in group-2 should target group-2
    const pinBtn = screen.getByRole('button', { name: /Pin Challenge/i });
    await user.click(pinBtn);

    const titleInput = screen.getByPlaceholderText(/Clean & organize kitchen shelf/i);
    const descInput = screen.getByPlaceholderText(/Describe the therapeutic cleaning/i);
    await user.type(titleInput, 'Group 2 Challenge 🌟');
    await user.type(descInput, 'Group 2 description');

    const submitBtn = screen.getByRole('button', { name: /Pin Challenge to Town Square/i });
    await user.click(submitBtn);

    expect(mockCreateGroupChallenge).toHaveBeenCalledWith(
      'group-2',
      'Group 2 Challenge 🌟',
      'Group 2 description',
      1.5
    );
  });

  it('prevents inflight challenge completion response from overwriting or subtracting points after switching groups', async () => {
    const user = userEvent.setup();
    let resolveComplete: (val: any) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveComplete = resolve;
    });

    mockCompleteGroupChallenge.mockReturnValue(pendingPromise);

    const { rerender } = render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={300}
        isAdmin={false}
      />
    );

    expect(screen.getByText('300 / 500 pts')).toBeInTheDocument();

    // Click complete in group-1
    const completeBtns = screen.getAllByRole('button', { name: /Complete Challenge/i });
    await user.click(completeBtns[0]);

    // Optimistic update for group-1: 300 + 38 = 338
    expect(screen.getByText('338 / 500 pts')).toBeInTheDocument();

    // User navigates/switches to group-2 with 800 points before group-1 resolves
    rerender(
      <CommunityBulletinBoard
        groupId="group-2"
        groupPooledPoints={800}
        isAdmin={false}
      />
    );

    expect(screen.getByText('800 / 1,200 pts')).toBeInTheDocument();

    // Now group-1 resolves with group-1's authoritative points
    resolveComplete({
      success: true,
      newPersonalPoints: 65,
      newGroupPoints: 345, // group-1's points
    });

    await pendingPromise;

    // Personal points should update
    expect(useCozyStore.getState().points).toBe(65);

    // Group-2's displayed points MUST NOT be corrupted by group-1's 345 points
    expect(screen.getByText('800 / 1,200 pts')).toBeInTheDocument();
    expect(screen.queryByText(/345/)).not.toBeInTheDocument();
  });

  it('renders communal village milestones and unlocks fairy lights and streetlamps at 350 pts', () => {
    render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={350}
        isAdmin={false}
      />
    );

    expect(screen.getByTestId('communal-village-milestones')).toBeInTheDocument();
    expect(screen.getByText('Village Communal Transformations')).toBeInTheDocument();
    expect(screen.getByTestId('fairy-lights-garland')).toBeInTheDocument();

    // Fairy Lights (150 pts) and Streetlamps (350 pts) are unlocked
    expect(screen.getByTestId('village-milestone-milestone-fairy-lights')).toBeInTheDocument();
    expect(screen.getByTestId('village-milestone-milestone-streetlamps')).toBeInTheDocument();
    expect(screen.getByText('2 / 5 Active')).toBeInTheDocument();

    // Garden (750 pts) is still in progress
    expect(screen.getByText('400 pts left')).toBeInTheDocument();
    expect(screen.queryByTestId('communal-garden-blooming')).not.toBeInTheDocument();
  });

  it('blooms communal garden ribbon when group points reach or exceed 750 pts', () => {
    render(
      <CommunityBulletinBoard
        groupId="group-1"
        groupPooledPoints={800}
        isAdmin={false}
      />
    );

    expect(screen.getByTestId('communal-garden-blooming')).toBeInTheDocument();
    expect(screen.getByText(/Communal Garden in Full Bloom/i)).toBeInTheDocument();
    expect(screen.getByText('3 / 5 Active')).toBeInTheDocument();
  });
});


