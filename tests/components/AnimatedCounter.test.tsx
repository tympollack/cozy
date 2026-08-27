import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

describe('AnimatedCounter Component (Scope D)', () => {
  it('renders numeric values with local string formatting', () => {
    const { rerender } = render(<AnimatedCounter value={1250} />);
    expect(screen.getByText('1,250')).toBeInTheDocument();

    rerender(<AnimatedCounter value={1300} />);
    expect(screen.getByText('1,300')).toBeInTheDocument();
  });

  it('renders zero and negative balances correctly', () => {
    const { rerender } = render(<AnimatedCounter value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<AnimatedCounter value={-50} />);
    expect(screen.getByText('-50')).toBeInTheDocument();
  });
});
