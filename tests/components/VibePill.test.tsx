import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VibePill } from '@/components/VibePill';
import { useCozyStore } from '@/store/useCozyStore';

describe('VibePill Component (Scope D)', () => {
  const todayISO = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      vibeStatus: 'neutral',
      lastVibeCheckDate: todayISO,
    });
  });

  it('renders daily check-in prompt when vibe check is due today', async () => {
    useCozyStore.setState({ lastVibeCheckDate: null });
    render(<VibePill />);
    expect(screen.getByText('✨')).toBeInTheDocument();
    expect(screen.getByText('Daily Vibe')).toBeInTheDocument();

    const user = userEvent.setup();
    const promptButton = screen.getByRole('button', { name: /Daily Vibe/i });
    await user.click(promptButton);
    expect(screen.getByText(/Daily Vibe Check/i)).toBeInTheDocument();
  });

  it('renders neutral cozy vibe status when checked in today', () => {
    useCozyStore.setState({ vibeStatus: 'neutral', lastVibeCheckDate: todayISO });
    render(<VibePill />);
    expect(screen.getByText('☕')).toBeInTheDocument();
    expect(screen.getByText('Cozy')).toBeInTheDocument();
  });

  it('renders sunshine status when vibe is sunshine and checked in today', () => {
    useCozyStore.setState({ vibeStatus: 'sunshine', lastVibeCheckDate: todayISO });
    render(<VibePill />);
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('Sunshine')).toBeInTheDocument();
  });

  it('renders raincloud status when vibe is raincloud and checked in today', () => {
    useCozyStore.setState({ vibeStatus: 'raincloud', lastVibeCheckDate: todayISO });
    render(<VibePill />);
    expect(screen.getByText('🌧️')).toBeInTheDocument();
    expect(screen.getByText('Raincloud')).toBeInTheDocument();
  });

  it('opens VibeCheckModal on button click when already checked in today', async () => {
    useCozyStore.setState({ vibeStatus: 'neutral', lastVibeCheckDate: todayISO });
    const user = userEvent.setup();
    render(<VibePill />);

    const pillButton = screen.getByRole('button', { name: /Cozy/i });
    await user.click(pillButton);

    expect(screen.getByText(/Daily Vibe Check/i)).toBeInTheDocument();
  });
});
