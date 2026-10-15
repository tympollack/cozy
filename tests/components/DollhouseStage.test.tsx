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

  it('only fires onPropClick for interactive furniture and ignores non-interactive props', () => {
    const onPropClick = vi.fn();
    const { container } = render(
      <DollhouseStage
        theme="cottage"
        onPropClick={onPropClick}
        furniture={[
          {
            id: 'decor-rug',
            name: 'Woven Amber Rug',
            category: 'decor',
            gridPos: { col: 1, row: 1, z: 0 },
            spriteType: 'cozy_rug_woven',
            interactive: false,
          },
          {
            id: 'interactive-chair',
            name: 'Tufted Armchair',
            category: 'seating',
            gridPos: { col: 2, row: 2, z: 0 },
            spriteType: 'armchair_amber',
            interactive: true,
          },
        ]}
      />,
    );

    const nonInteractive = container.querySelector('.dollhouse-furniture-layer g:not(.cursor-pointer)');
    expect(nonInteractive).toBeInTheDocument();
    if (nonInteractive) {
      fireEvent.click(nonInteractive);
      expect(onPropClick).not.toHaveBeenCalled();
    }

    const interactive = container.querySelector('.dollhouse-furniture-layer g.cursor-pointer');
    expect(interactive).toBeInTheDocument();
    if (interactive) {
      fireEvent.click(interactive);
      expect(onPropClick).toHaveBeenCalledTimes(1);
    }
  });

  it('supports keyboard navigation for interactive props via Enter and Space keys', () => {
    const onPropClick = vi.fn();
    const { container } = render(
      <DollhouseStage
        theme="cottage"
        onPropClick={onPropClick}
        furniture={[
          {
            id: 'interactive-desk',
            name: 'Oak Study Desk',
            category: 'desk',
            gridPos: { col: 0, row: 2, z: 0 },
            spriteType: 'desk_wooden',
            interactive: true,
          },
        ]}
      />,
    );

    const interactiveProp = container.querySelector('.dollhouse-furniture-layer g[role="button"]');
    expect(interactiveProp).toBeInTheDocument();
    if (interactiveProp) {
      fireEvent.keyDown(interactiveProp, { key: 'Enter' });
      expect(onPropClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(interactiveProp, { key: ' ' });
      expect(onPropClick).toHaveBeenCalledTimes(2);
    }
  });

  it('renders night mode vignette even when showWeatherAuras is false', () => {
    const { container } = render(
      <DollhouseStage showWeatherAuras={false} nightMode={true} />,
    );
    const nightVignette = container.querySelector('[data-testid="dollhouse-night-vignette"]');
    expect(nightVignette).toBeInTheDocument();
  });

  it('uses unique scoped gradient IDs to avoid mixing lighting across multiple stages', () => {
    const { container: c1 } = render(<DollhouseStage theme="cottage" />);
    const { container: c2 } = render(<DollhouseStage theme="castle" />);

    const grad1 = c1.querySelector('radialGradient');
    const grad2 = c2.querySelector('radialGradient');
    expect(grad1?.id).toBeDefined();
    expect(grad2?.id).toBeDefined();
    expect(grad1?.id).not.toBe(grad2?.id);
  });

  it('renders market_stall building sprite correctly without returning null', () => {
    const { container } = render(
      <VillageMacroPlot
        buildings={[
          { id: 'stall-1', type: 'market_stall', col: 2, row: 2 },
        ]}
      />,
    );

    const structures = container.querySelector('.village-structures');
    expect(structures?.textContent).toBeDefined();
    // Market stall has produce circles and striped canopy polygons
    const circles = structures?.querySelectorAll('circle');
    expect(circles && circles.length).toBeGreaterThan(0);
  });

  it('offsets elevated buildings along the Y-axis according to building.z', () => {
    const { container: groundContainer } = render(
      <VillageMacroPlot
        buildings={[{ id: 'b-ground', type: 'cottage_wood', col: 2, row: 2, z: 0 }]}
      />,
    );
    const { container: elevatedContainer } = render(
      <VillageMacroPlot
        buildings={[{ id: 'b-elevated', type: 'cottage_wood', col: 2, row: 2, z: 25 }]}
      />,
    );

    const groundGroup = groundContainer.querySelector('[data-building-id="b-ground"]');
    const elevatedGroup = elevatedContainer.querySelector('[data-building-id="b-elevated"]');

    const groundTransform = groundGroup?.getAttribute('transform');
    const elevatedTransform = elevatedGroup?.getAttribute('transform');

    expect(groundTransform).toBeDefined();
    expect(elevatedTransform).toBeDefined();
    expect(groundTransform).not.toEqual(elevatedTransform);
  });

  it('constrains buildings and plot anchors within custom gridSize bounds', () => {
    const { container } = render(
      <VillageMacroPlot
        gridSize={4}
        buildings={[
          { id: 'inside', type: 'cottage_wood', col: 1, row: 1 },
          { id: 'outside', type: 'windmill', col: 5, row: 6 },
        ]}
        plotAnchors={[
          { id: 'p-in', label: 'Inside Plot', col: 2, row: 2, occupiedByName: 'Inside Resident' },
          { id: 'p-out', label: 'Outside Plot', col: 6, row: 7, occupiedByName: 'Outside Resident' },
        ]}
      />,
    );

    expect(screen.getByText('Inside Resident')).toBeInTheDocument();
    expect(screen.queryByText('Outside Resident')).not.toBeInTheDocument();
    expect(container.querySelector('[data-building-id="inside"]')).toBeInTheDocument();
    expect(container.querySelector('[data-building-id="outside"]')).not.toBeInTheDocument();
  });

  it('renders unnamed occupied plots as occupied with fallback text', () => {
    render(
      <VillageMacroPlot
        plotAnchors={[
          { id: 'p-unnamed', label: 'Secret Nook', col: 1, row: 1, occupiedByUserId: 'usr-123' },
        ]}
      />,
    );

    expect(screen.getByText('Resident')).toBeInTheDocument();
  });

  it('supports keyboard selection on village plot anchors via Enter and Space keys', () => {
    const onSelectPlot = vi.fn();
    const { container } = render(
      <VillageMacroPlot
        plotAnchors={[
          { id: 'p-keyboard', label: 'Key Plot', col: 1, row: 1 },
        ]}
        onSelectPlot={onSelectPlot}
      />,
    );

    const anchorGroup = container.querySelector('.village-structures g[role="button"]');
    expect(anchorGroup).toBeInTheDocument();
    if (anchorGroup) {
      fireEvent.keyDown(anchorGroup, { key: 'Enter' });
      expect(onSelectPlot).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(anchorGroup, { key: ' ' });
      expect(onSelectPlot).toHaveBeenCalledTimes(2);
    }
  });
});
