import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VibePill } from '@/components/VibePill';
import { useCozyStore } from '@/store/useCozyStore';

describe('VibePill Component (Scope D)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      vibeStatus: 'neutral',
    });
  });

  it('renders neutral cozy vibe status by default', () => {
    render(<VibePill />);
    expect(screen.getByText('☕')).toBeInTheDocument();
    expect(screen.getByText('Cozy')).toBeInTheDocument();
  });

  it('renders sunshine status when vibe is sunshine', () => {
    useCozyStore.setState({ vibeStatus: 'sunshine' });
    render(<VibePill />);
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('Sunshine')).toBeInTheDocument();
  });

  it('renders raincloud status when vibe is raincloud', () => {
    useCozyStore.setState({ vibeStatus: 'raincloud' });
    render(<VibePill />);
    expect(screen.getByText('🌧️')).toBeInTheDocument();
    expect(screen.getByText('Raincloud')).toBeInTheDocument();
  });

  it('opens VibeCheckModal on button click', async () => {
    const user = userEvent.setup();
    render(<VibePill />);

    const pillButton = screen.getByRole('button', { name: /Cozy/i });
    await user.click(pillButton);

    expect(screen.getByText(/Daily Vibe Check/i)).toBeInTheDocument();
  });
});
