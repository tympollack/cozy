import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingCarousel } from '@/components/OnboardingCarousel';
import { useCozyStore } from '@/store/useCozyStore';

// Mock onboarding server actions
vi.mock('@/app/actions/onboardingActions', () => ({
  saveUserFocusNookAction: vi.fn().mockResolvedValue({ success: true, nook: 'bedside' }),
  awardStarterSandboxBonusAction: vi.fn().mockResolvedValue({ success: true, pointsAwarded: 50 }),
}));

describe('OnboardingCarousel Component (Phase 3 Single Corner)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      hasSeenOnboarding: false,
      focusNook: 'desk',
      hasCompletedSandbox: false,
      points: 0,
    });
  });

  it('renders Step 1 with single corner focus nooks', () => {
    render(<OnboardingCarousel />);
    expect(screen.getByText('Your Cozy Corner')).toBeInTheDocument();
    expect(screen.getByText('Start with one small space')).toBeInTheDocument();

    // Verify all 5 comforting corner nooks are rendered
    expect(screen.getByText('Desk Nook')).toBeInTheDocument();
    expect(screen.getByText('Bedside Table')).toBeInTheDocument();
    expect(screen.getByText('Reading Chair')).toBeInTheDocument();
    expect(screen.getByText('Plant Shelf')).toBeInTheDocument();
    expect(screen.getByText('Tea Station')).toBeInTheDocument();
  });

  it('allows user to pick a corner nook and updates store', async () => {
    const user = userEvent.setup();
    render(<OnboardingCarousel />);

    const bedsideButton = screen.getByRole('button', { name: /Bedside Table/i });
    await user.click(bedsideButton);

    expect(useCozyStore.getState().focusNook).toBe('bedside');
  });

  it('progresses through steps and completes onboarding on last step', async () => {
    const user = userEvent.setup();
    render(<OnboardingCarousel />);

    // Step 1 -> Step 2
    const nextBtn1 = screen.getByRole('button', { name: /Pick My Corner/i });
    await user.click(nextBtn1);
    expect(await screen.findByText('Day & Night Cadence')).toBeInTheDocument();

    // Step 2 -> Step 3 (Sandbox)
    const nextBtn2 = await screen.findByRole('button', { name: /Try First Corner/i });
    await user.click(nextBtn2);
    expect(await screen.findByText('First Corner Sandbox')).toBeInTheDocument();

    // Step 3 -> Step 4 (Village)
    const nextBtn3 = await screen.findByRole('button', { name: /Next: Village/i });
    await user.click(nextBtn3);
    expect(await screen.findByText('Warm Neighborhood')).toBeInTheDocument();

    // Step 4 -> Enter Cozy (Complete)
    const enterBtn = await screen.findByRole('button', { name: /Enter Cozy/i });
    await user.click(enterBtn);

    expect(useCozyStore.getState().hasSeenOnboarding).toBe(true);
  });

  it('completes onboarding immediately when "Skip intro" is clicked', async () => {
    const user = userEvent.setup();
    render(<OnboardingCarousel />);

    const skipBtn = screen.getByRole('button', { name: /Skip intro/i });
    await user.click(skipBtn);

    expect(useCozyStore.getState().hasSeenOnboarding).toBe(true);
  });

  it('does not render if hasSeenOnboarding is true in store', () => {
    useCozyStore.setState({ hasSeenOnboarding: true });
    const { container } = render(<OnboardingCarousel />);
    expect(container.firstChild).toBeNull();
  });
});
