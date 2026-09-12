import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingSandbox } from '@/components/OnboardingSandbox';
import { useCozyStore } from '@/store/useCozyStore';

vi.mock('@/app/actions/onboardingActions', () => ({
  awardStarterSandboxBonusAction: vi.fn().mockResolvedValue({
    success: true,
    pointsAwarded: 50,
    newBalance: 50,
  }),
}));

describe('OnboardingSandbox Component (TASK-COZY-ONBOARD-SANDBOX)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      points: 0,
      hasCompletedSandbox: false,
      focusNook: 'desk',
    });
  });

  it('renders corner templates, starter stickers and claim CTA', () => {
    render(<OnboardingSandbox />);

    expect(screen.getByRole('button', { name: /Desk Nook/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bedside Table/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reading Chair/i })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Add Warm Tea sticker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Cozy Candle sticker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Succulent sticker/i })).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Complete First Corner/i })
    ).toBeInTheDocument();
  });

  it('allows switching corner templates', async () => {
    const user = userEvent.setup();
    render(<OnboardingSandbox />);

    const bedsideBtn = screen.getByRole('button', { name: /Bedside Table/i });
    await user.click(bedsideBtn);

    expect(screen.getByText('Dusk Bedside Table')).toBeInTheDocument();
  });

  it('adds stickers when clicked from the palette and allows clearing', async () => {
    const user = userEvent.setup();
    render(<OnboardingSandbox />);

    // Add a candle
    const candleBtn = screen.getByRole('button', { name: /Add Cozy Candle sticker/i });
    await user.click(candleBtn);

    expect(screen.getByText(/Starter Demo Stickers \(2 placed\)/i)).toBeInTheDocument();

    // Reset stickers
    const resetBtn = screen.getByRole('button', { name: /Reset stickers/i });
    await user.click(resetBtn);

    expect(screen.getByText(/Starter Demo Stickers \(0 placed\)/i)).toBeInTheDocument();
  });

  it('adds sticker on canvas click', async () => {
    render(<OnboardingSandbox />);

    const canvas = screen.getByRole('button', { name: /Interactive corner canvas/i });
    fireEvent.click(canvas, { clientX: 150, clientY: 100 });

    expect(screen.getByText(/Starter Demo Stickers \(2 placed\)/i)).toBeInTheDocument();
  });

  it('awards 50 points and completes sandbox on claim button click', async () => {
    const user = userEvent.setup();
    const onCompleteMock = vi.fn();
    render(<OnboardingSandbox onComplete={onCompleteMock} />);

    const claimBtn = screen.getByRole('button', { name: /Complete First Corner/i });
    await user.click(claimBtn);

    expect(useCozyStore.getState().points).toBe(50);
    expect(useCozyStore.getState().hasCompletedSandbox).toBe(true);
    expect(screen.getByText(/First Corner Tidied! \+50 Starter Points Claimed/i)).toBeInTheDocument();
  });
});
