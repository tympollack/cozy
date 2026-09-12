import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CircadianProgressPill } from '@/components/CircadianProgressPill';
import * as notifActions from '@/app/actions/notificationActions';

vi.mock('@/app/actions/notificationActions', () => ({
  getDailyCircadianStatus: vi.fn(),
}));

describe('CircadianProgressPill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending light and dark links when neither photo is taken', async () => {
    vi.mocked(notifActions.getDailyCircadianStatus).mockResolvedValue({
      success: true,
      lightCompleted: false,
      darkCompleted: false,
      bothCompleted: false,
      currentPhase: 'light',
      clientLocalHour: 10,
    });

    render(<CircadianProgressPill />);

    await waitFor(() => {
      expect(screen.getByTestId('circadian-light-pending')).toBeInTheDocument();
      expect(screen.getByTestId('circadian-dark-pending')).toBeInTheDocument();
    });

    const lightLink = screen.getByTestId('circadian-light-pending');
    expect(lightLink).toHaveAttribute('href', '/camera?mode=light');

    const darkLink = screen.getByTestId('circadian-dark-pending');
    expect(darkLink).toHaveAttribute('href', '/camera?mode=dark');
  });

  it('renders light completed checkmark and pending dark photo when only light is done', async () => {
    vi.mocked(notifActions.getDailyCircadianStatus).mockResolvedValue({
      success: true,
      lightCompleted: true,
      darkCompleted: false,
      bothCompleted: false,
      currentPhase: 'dark',
      clientLocalHour: 20,
    });

    render(<CircadianProgressPill />);

    await waitFor(() => {
      expect(screen.getByTestId('circadian-light-completed')).toBeInTheDocument();
      expect(screen.getByTestId('circadian-dark-pending')).toBeInTheDocument();
    });

    expect(screen.getByText(/Light Done/i)).toBeInTheDocument();
    expect(screen.queryByTestId('circadian-both-completed')).not.toBeInTheDocument();
  });

  it('renders dual completed badge when both light and dark photos are done', async () => {
    vi.mocked(notifActions.getDailyCircadianStatus).mockResolvedValue({
      success: true,
      lightCompleted: true,
      darkCompleted: true,
      bothCompleted: true,
      currentPhase: 'dark',
      clientLocalHour: 22,
    });

    render(<CircadianProgressPill />);

    await waitFor(() => {
      expect(screen.getByTestId('circadian-light-completed')).toBeInTheDocument();
      expect(screen.getByTestId('circadian-dark-completed')).toBeInTheDocument();
      expect(screen.getByTestId('circadian-both-completed')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dual Mode Complete/i)).toBeInTheDocument();
  });
});
