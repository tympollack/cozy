import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DollhouseStage } from '@/src/components/dollhouse/DollhouseStage';
import { WeatherAuraOverlay } from '@/src/components/dollhouse/WeatherAuraOverlay';
import { VillageMacroPlot } from '@/src/components/village/VillageMacroPlot';

describe('DollhouseStage 2.5D Isometric System', () => {
  it('renders cutaway walls and floor tileset responsively', () => {
    const { container } = render(
      <DollhouseStage theme="cottage" vibeStatus="sunshine" />,
    );

    const stage = screen.getByRole('region', { name: /2.5D Dollhouse Interior Stage/i });
    expect(stage).toBeInTheDocument();

    // Check SVG structure
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 800 600');

    // Check cutaway walls
    expect(container.querySelector('.wall-back-left')).toBeInTheDocument();
    expect(container.querySelector('.wall-back-right')).toBeInTheDocument();
    expect(container.querySelector('.cutaway-foreground-trim')).toBeInTheDocument();

    // Check floor tiles
    const floorTiles = container.querySelectorAll('.floor-tileset polygon');
    expect(floorTiles.length).toBeGreaterThan(20);
  });

  it('populates room interior with Kenney 2D Furniture Kit props', () => {
    const onPropClick = vi.fn();
    const { container } = render(
      <DollhouseStage
        theme="cottage"
        vibeStatus="neutral"
        onPropClick={onPropClick}
      />,
    );

    const furnitureLayer = container.querySelector('.dollhouse-furniture-layer');
    expect(furnitureLayer).toBeInTheDocument();

    // Default furniture has 11 props
    expect(furnitureLayer?.children.length).toBe(11);

    // Clicking an interactive prop (e.g. armchair) triggers callback and toast
    const interactiveProps = container.querySelectorAll('.dollhouse-furniture-layer g.cursor-pointer');
    expect(interactiveProps.length).toBeGreaterThan(0);

    fireEvent.click(interactiveProps[0]);
    expect(onPropClick).toHaveBeenCalledTimes(1);
  });

  it('updates ambient lighting tiles cleanly upon theme switching', () => {
    const { rerender, container } = render(
      <DollhouseStage theme="cottage" />,
    );
    const stage = screen.getByRole('region', { name: /2.5D Dollhouse Interior Stage/i });
    expect(stage.getAttribute('style')).toContain('rgb(43, 31, 26)');

    rerender(<DollhouseStage theme="campsite" />);
    expect(stage.getAttribute('style')).toContain('rgb(19, 36, 27)');

    rerender(<DollhouseStage theme="castle" />);
    expect(stage.getAttribute('style')).toContain('rgb(28, 29, 34)');
  });

  it('renders ambient weather status auras based on Vibe Check state', () => {
    const { container: c1 } = render(<WeatherAuraOverlay vibeStatus="sunshine" />);
    expect(c1.querySelector('polygon')).toBeInTheDocument(); // sunbeam polygon

    const { container: c2 } = render(<WeatherAuraOverlay vibeStatus="breezy" />);
    expect(c2.textContent).toContain('🍃');

    const { container: c3 } = render(<WeatherAuraOverlay vibeStatus="starlight" />);
    expect(c3.textContent).toContain('✦');

    const { container: c4 } = render(<WeatherAuraOverlay vibeStatus="raincloud" />);
    expect(c4.querySelectorAll('line').length).toBeGreaterThan(10); // rain streaks
  });
});

describe('VillageMacroPlot 2.5D Isometric System', () => {
  it('renders village macro-plot with isometric buildings and plot anchors', () => {
    const onSelectPlot = vi.fn();
    const { container } = render(
      <VillageMacroPlot
        villageName="Test Haven"
        vibeStatus="sunshine"
        onSelectPlot={onSelectPlot}
      />,
    );

    expect(screen.getByText('Test Haven')).toBeInTheDocument();

    // Check terrain grid
    const terrainTiles = container.querySelectorAll('.village-terrain-grid polygon');
    expect(terrainTiles.length).toBe(64); // 8x8 grid

    // Check structures and anchors
    const structures = container.querySelector('.village-structures');
    expect(structures).toBeInTheDocument();

    // Click an anchor
    const clickablePlot = screen.getByText('You');
    expect(clickablePlot).toBeInTheDocument();
    fireEvent.click(clickablePlot);
    expect(onSelectPlot).toHaveBeenCalled();
  });
});
