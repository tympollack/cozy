import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PorchHoldingPen } from '@/components/PorchHoldingPen';
import type { PorchItem } from '@/app/actions/waterfallActions';

describe('PorchHoldingPen Component', () => {
  const items: PorchItem[] = [
    {
      id: 'item-1',
      senderId: 'user-1',
      senderName: 'Maya',
      itemType: 'tea',
      message: 'Warm herbal tea for your evening.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      senderId: 'user-2',
      senderName: 'Alex',
      itemType: 'blanket',
      message: 'A cozy blanket left on the porch.',
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders nothing when items list is empty', () => {
    const { container } = render(<PorchHoldingPen items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders consolidated soft digest banner when items exist', () => {
    render(<PorchHoldingPen items={items} />);
    expect(screen.getByText('Porch Holding Pen')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText(/2 campmates left cozy thoughts for you/i)).toBeInTheDocument();
  });

  it('opens Porch modal and displays 2.5D wooden porch shelf with clickable items', async () => {
    const user = userEvent.setup();
    render(<PorchHoldingPen items={items} />);

    const openButton = screen.getByRole('button', { name: /Porch Holding Pen/i });
    await user.click(openButton);

    expect(screen.getByText('Your Virtual Porch')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();

    // Click on Maya's item to inspect note
    const mayaItem = screen.getByRole('button', { name: /Maya/i });
    await user.click(mayaItem);

    expect(screen.getByText(/"Warm herbal tea for your evening."/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call\/Text 988 Helpline/i })).toHaveAttribute(
      'href',
      'tel:988'
    );
  });
});
