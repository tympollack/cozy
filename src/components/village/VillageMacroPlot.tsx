'use client';

/**
 * @module components/village/VillageMacroPlot
 *
 * 2.5D isometric village macro-plot viewport.
 * Uses Kenney Isometric Buildings, Tiny Town terrain tiles, and member plot anchors.
 * Supports weather particles driven by the community Vibe Check state.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { VillageMacroPlotProps, VillagePlotAnchor, VillageBuilding } from './types';
import { WeatherAuraOverlay } from '../dollhouse/WeatherAuraOverlay';

const DEFAULT_GRID_SIZE = 8;
const TILE_W = 80;
const TILE_H = 40;

const DEFAULT_BUILDINGS: VillageBuilding[] = [
  { id: 'b-townhall', type: 'tiny_town_hall', col: 3, row: 3 },
  { id: 'b-cottage-1', type: 'cottage_wood', col: 1, row: 2 },
  { id: 'b-cottage-2', type: 'cottage_wood', col: 5, row: 2 },
  { id: 'b-windmill', type: 'windmill', col: 6, row: 5 },
  { id: 'b-well', type: 'stone_well', col: 3, row: 4 },
  { id: 'b-tree-1', type: 'cozy_tree', col: 0, row: 1 },
  { id: 'b-tree-2', type: 'cozy_tree', col: 7, row: 1 },
  { id: 'b-tree-3', type: 'cozy_tree', col: 1, row: 6 },
  { id: 'b-tree-4', type: 'cozy_tree', col: 6, row: 7 },
];

const DEFAULT_PLOT_ANCHORS: VillagePlotAnchor[] = [
  { id: 'plot-1', label: 'Meadow Nook', col: 2, row: 1, occupiedByName: 'You' },
  { id: 'plot-2', label: 'Sunnyside Plot', col: 5, row: 1, occupiedByName: 'Chloe' },
  { id: 'plot-3', label: 'Hearth Plot', col: 1, row: 4, occupiedByName: 'Liam' },
  { id: 'plot-4', label: 'Riverside Plot', col: 6, row: 4, occupiedByName: 'Aria' },
  { id: 'plot-5', label: 'Windmill View', col: 4, row: 6 },
  { id: 'plot-6', label: 'Garden Edge', col: 2, row: 6 },
];

export function VillageMacroPlot({
  gridSize = DEFAULT_GRID_SIZE,
  villageName = 'Mossy Hearth Village',
  vibeStatus = 'sunshine',
  plotAnchors = DEFAULT_PLOT_ANCHORS,
  buildings = DEFAULT_BUILDINGS,
  onSelectPlot,
  className = '',
}: VillageMacroPlotProps) {
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const originX = 500;
  const originY = 160;

  function toScreen(col: number, row: number, z = 0) {
    return {
      x: originX + (col - row) * (TILE_W / 2),
      y: originY + (col + row) * (TILE_H / 2) - z,
    };
  }

  // Combined render items sorted back-to-front by isometric depth: col + row
  interface DepthItem {
    type: 'building' | 'anchor';
    key: string;
    col: number;
    row: number;
    depth: number;
    building?: VillageBuilding;
    anchor?: VillagePlotAnchor;
  }

  const depthItems: DepthItem[] = [
    ...buildings.map((b) => ({
      type: 'building' as const,
      key: b.id,
      col: b.col,
      row: b.row,
      depth: (b.col + b.row) * 100 + (b.z ?? 0),
      building: b,
    })),
    ...plotAnchors.map((a) => ({
      type: 'anchor' as const,
      key: a.id,
      col: a.col,
      row: a.row,
      depth: (a.col + a.row) * 100 + 10,
      anchor: a,
    })),
  ].sort((a, b) => a.depth - b.depth);

  function handleAnchorClick(anchor: VillagePlotAnchor) {
    setSelectedPlotId(anchor.id);
    onSelectPlot?.(anchor);
  }

  return (
    <div
      className={`relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-950/20 select-none bg-gradient-to-b from-[#1c2e22] via-[#16241b] to-[#0d1610] ${className}`}
      role="region"
      aria-label="2.5D Village Macro-Plot Stage"
    >
      {/* Header bar */}
      <div className="absolute top-4 left-5 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-200">
        <span>🏡</span>
        <span>{villageName}</span>
      </div>

      {/* Weather particles layer */}
      <WeatherAuraOverlay vibeStatus={vibeStatus} />

      {/* Isometric Village SVG */}
      <svg
        className="relative z-10 w-full h-full"
        viewBox="0 0 1000 750"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="grass-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#365314" />
            <stop offset="100%" stopColor="#283e0f" />
          </linearGradient>
          <linearGradient id="grass-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3f6212" />
            <stop offset="100%" stopColor="#2e4a0d" />
          </linearGradient>
          <linearGradient id="path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#57534e" />
          </linearGradient>
          <linearGradient id="water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>

        {/* ── Terrain Tileset ── */}
        <g className="village-terrain-grid">
          {Array.from({ length: gridSize }).map((_, col) =>
            Array.from({ length: gridSize }).map((__, row) => {
              const top = toScreen(col, row);
              const right = toScreen(col + 1, row);
              const bottom = toScreen(col + 1, row + 1);
              const left = toScreen(col, row + 1);

              // Terrain logic: central crossroads path, water stream on edge
              const isPath = col === 3 || row === 3;
              const isWater = col === 7;
              const isEven = (col + row) % 2 === 0;

              const fill = isWater
                ? 'url(#water-grad)'
                : isPath
                ? 'url(#path-grad)'
                : isEven
                ? 'url(#grass-grad-1)'
                : 'url(#grass-grad-2)';

              const stroke = isWater ? '#0284c7' : isPath ? '#44403c' : '#1e300b';

              return (
                <polygon
                  key={`v-tile-${col}-${row}`}
                  points={`${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="0.8"
                />
              );
            }),
          )}
        </g>

        {/* ── Depth-Sorted Buildings and Plot Anchors ── */}
        <g className="village-structures">
          {depthItems.map((item) => {
            const { x, y } = toScreen(item.col, item.row);

            if (item.type === 'building' && item.building) {
              return (
                <g key={item.key} transform={`translate(${x}, ${y})`}>
                  {renderBuilding(item.building.type)}
                </g>
              );
            }

            if (item.type === 'anchor' && item.anchor) {
              const anchor = item.anchor;
              const isSelected = selectedPlotId === anchor.id;
              const isOccupied = Boolean(anchor.occupiedByName);

              return (
                <g
                  key={item.key}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => handleAnchorClick(anchor)}
                  className="cursor-pointer"
                >
                  {/* Plot Base Disc */}
                  <ellipse
                    cx="0"
                    cy="8"
                    rx="26"
                    ry="13"
                    fill={isOccupied ? '#10b981' : '#f59e0b'}
                    opacity={isSelected ? 0.6 : 0.35}
                    stroke={isSelected ? '#ffffff' : isOccupied ? '#059669' : '#d97706'}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Marker Pin */}
                  <g transform="translate(0, -18)">
                    <ellipse cx="0" cy="20" rx="6" ry="3" fill="#000000" opacity="0.3" />
                    <line x1="0" y1="0" x2="0" y2="18" stroke="#ffffff" strokeWidth="2" />
                    <circle
                      cx="0"
                      cy="0"
                      r="12"
                      fill={isOccupied ? '#059669' : '#d97706'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {isOccupied ? '🏡' : '+'}
                    </text>
                  </g>

                  {/* Name label */}
                  {isOccupied && (
                    <text
                      x="0"
                      y="-34"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="2"
                      paintOrder="stroke"
                    >
                      {anchor.occupiedByName}
                    </text>
                  )}
                </g>
              );
            }

            return null;
          })}
        </g>
      </svg>
    </div>
  );
}

function renderBuilding(type: VillageBuilding['type']) {
  switch (type) {
    case 'cottage_wood':
      // Kenney isometric cottage building
      return (
        <g>
          <ellipse cx="0" cy="10" rx="32" ry="16" fill="#000000" opacity="0.25" />
          {/* Walls */}
          <polygon points="-24,-24 0,-12 0,16 -24,4" fill="#a16207" />
          <polygon points="0,-12 24,-24 24,4 0,16" fill="#854d0e" />
          {/* Wooden Door */}
          <polygon points="6,2 14,-2 14,13 6,17" fill="#451a03" />
          {/* Overhanging Gable Roof */}
          <polygon points="-28,-22 0,-36 0,-10 -28,4" fill="#dc2626" />
          <polygon points="0,-36 28,-22 28,4 0,-10" fill="#b91c1c" />
          {/* Chimney */}
          <polygon points="-16,-40 -10,-43 -10,-28 -16,-25" fill="#57534e" />
        </g>
      );

    case 'tiny_town_hall':
      // 2.5D Town hall with bell spire
      return (
        <g>
          <ellipse cx="0" cy="14" rx="42" ry="21" fill="#000000" opacity="0.3" />
          {/* Base structure */}
          <polygon points="-32,-32 0,-16 0,20 -32,4" fill="#475569" />
          <polygon points="0,-16 32,-32 32,4 0,20" fill="#334155" />
          {/* Arched entrance */}
          <polygon points="-8,-4 8,4 8,19 -8,11" fill="#1e293b" />
          {/* Roof */}
          <polygon points="-36,-30 0,-48 0,-14 -36,4" fill="#3b82f6" />
          <polygon points="0,-48 36,-30 36,4 0,-14" fill="#2563eb" />
          {/* Spire Tower */}
          <polygon points="-8,-54 8,-46 8,-32 -8,-40" fill="#475569" />
          <polygon points="0,-72 -10,-52 10,-48" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        </g>
      );

    case 'windmill':
      return (
        <g>
          <ellipse cx="0" cy="12" rx="26" ry="13" fill="#000000" opacity="0.25" />
          {/* Round stone tower */}
          <polygon points="-18,-42 0,-33 0,16 -18,7" fill="#cbd5e1" />
          <polygon points="0,-33 18,-42 18,7 0,16" fill="#94a3b8" />
          {/* Conical cap */}
          <polygon points="0,-58 -20,-40 20,-40" fill="#78350f" />
          {/* Windmill blades */}
          <g transform="translate(0, -44)">
            <circle cx="0" cy="0" r="3" fill="#451a03" />
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <line x1="0" y1="-26" x2="0" y2="26" stroke="#f8fafc" strokeWidth="2.5" />
              <line x1="-26" y1="0" x2="26" y2="0" stroke="#f8fafc" strokeWidth="2.5" />
            </motion.g>
          </g>
        </g>
      );

    case 'stone_well':
      return (
        <g>
          <ellipse cx="0" cy="6" rx="16" ry="8" fill="#000000" opacity="0.25" />
          {/* Stone base */}
          <polygon points="-12,-8 12,-8 10,6 -10,6" fill="#64748b" stroke="#475569" strokeWidth="1" />
          <ellipse cx="0" cy="-8" rx="12" ry="5" fill="#0369a1" />
          {/* Roof posts */}
          <line x1="-8" y1="-8" x2="-8" y2="-22" stroke="#78350f" strokeWidth="2" />
          <line x1="8" y1="-8" x2="8" y2="-22" stroke="#78350f" strokeWidth="2" />
          <polygon points="0,-28 -12,-20 12,-20" fill="#b91c1c" />
        </g>
      );

    case 'cozy_tree':
      return (
        <g>
          <ellipse cx="0" cy="8" rx="18" ry="9" fill="#000000" opacity="0.2" />
          {/* Trunk */}
          <line x1="0" y1="6" x2="0" y2="-12" stroke="#78350f" strokeWidth="4" />
          {/* Foliage spheres */}
          <circle cx="0" cy="-26" r="16" fill="#15803d" />
          <circle cx="-6" cy="-20" r="12" fill="#16a34a" />
          <circle cx="6" cy="-20" r="13" fill="#22c55e" />
          <circle cx="0" cy="-30" r="10" fill="#4ade80" opacity="0.6" />
        </g>
      );

    default:
      return null;
  }
}
