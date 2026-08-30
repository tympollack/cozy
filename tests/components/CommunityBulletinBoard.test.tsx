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
});
