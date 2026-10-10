'use client';

/**
 * @module components/dollhouse/DollhouseStage
 *
 * Primary 2.5D isometric dollhouse viewport for Cozy Villages.
 * Renders cutaway walls, floor tilesets, Kenney 2D Furniture Kit props,
 * and ambient weather status auras based on the user's daily Vibe Check.
 *
 * Projection Architecture:
 *   - Virtual canvas: 800×600 SVG viewBox (scalable without isometric distortion).
 *   - Standard 2:1 dimetric projection (tileWidth: 72, tileHeight: 36).
 *   - Cutaway architecture: Back-left and back-right walls rendered at full height;
 *     front walls cut away for direct, unobscured interior visibility.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { DollhouseStageProps, FurnitureProp, DollhouseRoomTheme } from './types';
import { FurnitureLayer } from './FurnitureLayer';
import { WeatherAuraOverlay } from './WeatherAuraOverlay';

const GRID_SIZE = 5;
const TILE_WIDTH = 72;
const TILE_HEIGHT = 36;
const WALL_HEIGHT = 175;

// Canonical default furniture loadout matching Kenney 2D Furniture Kit
const DEFAULT_FURNITURE: FurnitureProp[] = [
  {
    id: 'prop-rug',
    name: 'Woven Amber Rug',
    category: 'decor',
    gridPos: { col: 2, row: 2, z: 0 },
    spriteType: 'cozy_rug_woven',
  },
  {
    id: 'prop-armchair',
    name: 'Tufted Armchair',
    category: 'seating',
    gridPos: { col: 2, row: 2, z: 2 },
    spriteType: 'armchair_amber',
    interactive: true,
  },
  {
    id: 'prop-coffee-table',
    name: 'Wood Coffee Table',
    category: 'table',
    gridPos: { col: 2, row: 3, z: 0 },
    spriteType: 'coffee_table',
    interactive: true,
  },
  {
    id: 'prop-steaming-mug',
    name: 'Steaming Tea Mug',
    category: 'decor',
    gridPos: { col: 2, row: 3, z: 10 },
    spriteType: 'steaming_mug',
  },
  {
    id: 'prop-desk',
    name: 'Oak Study Desk',
    category: 'desk',
    gridPos: { col: 0, row: 2, z: 0 },
    spriteType: 'desk_wooden',
    interactive: true,
  },
  {
    id: 'prop-desk-lamp',
    name: 'Reading Lamp',
    category: 'lamp',
    gridPos: { col: 0, row: 2, z: 12 },
    spriteType: 'lamp_desk',
  },
  {
    id: 'prop-chair',
    name: 'Wooden Desk Chair',
    category: 'seating',
    gridPos: { col: 1, row: 2, z: 0 },
    spriteType: 'chair_cozy',
  },
  {
    id: 'prop-bookshelf',
    name: 'Tall Bookcase',
    category: 'storage',
    gridPos: { col: 2, row: 0, z: 0 },
    spriteType: 'bookshelf_wood',
    interactive: true,
  },
  {
    id: 'prop-plant',
    name: 'Potted Monstera',
    category: 'plant',
    gridPos: { col: 4, row: 0, z: 0 },
    spriteType: 'potted_monstera',
    interactive: true,
  },
  {
    id: 'prop-floor-lamp',
    name: 'Standing Floor Lamp',
    category: 'lamp',
    gridPos: { col: 0, row: 4, z: 0 },
    spriteType: 'lamp_floor_glowing',
    interactive: true,
  },
  {
    id: 'prop-bed',
    name: 'Cozy Quilted Bed',
    category: 'bed',
    gridPos: { col: 0, row: 0, z: 0 },
    spriteType: 'cushioned_bed',
    interactive: true,
  },
];

// Theme-specific palettes
interface ThemePalette {
  bgGradient: string;
  floorFillLight: string;
  floorFillDark: string;
  floorStroke: string;
  wallFillLeft: string;
  wallFillRight: string;
  wallStroke: string;
  baseboardFill: string;
  windowSky: string;
  ambientLight: string;
}

const THEME_PALETTES: Record<DollhouseRoomTheme, ThemePalette> = {
  cottage: {
    bgGradient: 'linear-gradient(135deg, #2b1f1a 0%, #17100d 100%)',
    floorFillLight: '#b45309',
    floorFillDark: '#92400e',
    floorStroke: '#78350f',
    wallFillLeft: '#451a03',
    wallFillRight: '#3b1402',
    wallStroke: '#2d0f01',
    baseboardFill: '#78350f',
    windowSky: '#38bdf8',
    ambientLight: 'rgba(251, 191, 36, 0.12)',
  },
  campsite: {
    bgGradient: 'linear-gradient(135deg, #13241b 0%, #0a140f 100%)',
    floorFillLight: '#2e4a3b',
    floorFillDark: '#1e3328',
    floorStroke: '#14241c',
    wallFillLeft: '#1e382b',
    wallFillRight: '#172d22',
    wallStroke: '#0d1c14',
    baseboardFill: '#3d634f',
    windowSky: '#0284c7',
    ambientLight: 'rgba(52, 211, 153, 0.10)',
  },
  castle: {
    bgGradient: 'linear-gradient(135deg, #1c1d22 0%, #0d0e12 100%)',
    floorFillLight: '#475569',
    floorFillDark: '#334155',
    floorStroke: '#1e293b',
    wallFillLeft: '#334155',
    wallFillRight: '#1e293b',
    wallStroke: '#0f172a',
    baseboardFill: '#64748b',
    windowSky: '#818cf8',
    ambientLight: 'rgba(167, 139, 250, 0.10)',
  },
  modern: {
    bgGradient: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
    floorFillLight: '#71717a',
    floorFillDark: '#52525b',
    floorStroke: '#3f3f46',
    wallFillLeft: '#3f3f46',
    wallFillRight: '#27272a',
    wallStroke: '#18181b',
    baseboardFill: '#a1a1aa',
    windowSky: '#38bdf8',
    ambientLight: 'rgba(244, 244, 245, 0.10)',
  },
};

export function DollhouseStage({
  theme = 'cottage',
  vibeStatus = 'neutral',
  furniture = DEFAULT_FURNITURE,
  className = '',
  onPropClick,
  showWeatherAuras = true,
  nightMode = false,
}: DollhouseStageProps) {
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);

  // Normalise theme name
  const effectiveTheme: DollhouseRoomTheme =
    theme === 'campsite' || theme === 'cozy_campsite'
      ? 'campsite'
      : theme === 'castle' || theme === 'stone_castle'
      ? 'castle'
      : theme === 'modern'
      ? 'modern'
      : 'cottage';

  const palette = THEME_PALETTES[effectiveTheme];

  // Isometric Grid Origin (top center of the floor diamond)
  const originX = 400;
  const originY = 240;

  function toScreen(col: number, row: number, z = 0) {
    return {
      x: originX + (col - row) * (TILE_WIDTH / 2),
      y: originY + (col + row) * (TILE_HEIGHT / 2) - z,
    };
  }

  // Back-left wall corner points (spans row from 0 to GRID_SIZE, col = 0)
  const wallCornerTop = { x: originX, y: originY - WALL_HEIGHT };
  const wallLeftFloor = toScreen(0, GRID_SIZE, 0);
  const wallLeftTop = { x: wallLeftFloor.x, y: wallLeftFloor.y - WALL_HEIGHT };

  // Back-right wall corner points (spans col from 0 to GRID_SIZE, row = 0)
  const wallRightFloor = toScreen(GRID_SIZE, 0, 0);
  const wallRightTop = { x: wallRightFloor.x, y: wallRightFloor.y - WALL_HEIGHT };

  // Floor bottom corner point
  const floorBottom = toScreen(GRID_SIZE, GRID_SIZE, 0);

  function handlePropClick(prop: FurnitureProp) {
    setSelectedPropId(prop.id);
    onPropClick?.(prop);
  }

  return (
    <div
      className={`relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-950/20 select-none ${className}`}
      style={{ background: palette.bgGradient }}
      role="region"
      aria-label="2.5D Dollhouse Interior Stage"
    >
      {/* ── Layer 1: Ambient Weather Auras & Particles ── */}
      {showWeatherAuras && (
        <WeatherAuraOverlay vibeStatus={vibeStatus} nightMode={nightMode} />
      )}

      {/* ── Layer 2: Vector Isometric Dollhouse Room SVG ── */}
      <svg
        className="relative z-10 w-full h-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Wall texture pattern */}
          <pattern id="wall-planks" width="16" height="32" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="32" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          {/* Floor gloss gradient */}
          <radialGradient id="floor-ambient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.ambientLight} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── Back-Left Wall ── */}
        <g className="wall-back-left">
          <polygon
            points={`${originX},${originY} ${wallLeftFloor.x},${wallLeftFloor.y} ${wallLeftTop.x},${wallLeftTop.y} ${wallCornerTop.x},${wallCornerTop.y}`}
            fill={palette.wallFillLeft}
            stroke={palette.wallStroke}
            strokeWidth="1.5"
          />
          {/* Wall Baseboard Trim */}
          <polygon
            points={`${originX},${originY} ${wallLeftFloor.x},${wallLeftFloor.y} ${wallLeftFloor.x},${wallLeftFloor.y - 12} ${originX},${originY - 12}`}
            fill={palette.baseboardFill}
            opacity="0.8"
          />

          {/* Arched Window cut into Back-Left Wall */}
          <g transform={`translate(${originX - 110}, ${originY - 125}) skewY(26.5)`}>
            {/* Window Opening */}
            <path
              d="M 0 45 L 0 16 A 16 16 0 0 1 32 16 L 32 45 Z"
              fill={palette.windowSky}
              stroke={palette.baseboardFill}
              strokeWidth="3"
            />
            {/* Window Muntin Bars */}
            <line x1="16" y1="0" x2="16" y2="45" stroke={palette.baseboardFill} strokeWidth="2" />
            <line x1="0" y1="24" x2="32" y2="24" stroke={palette.baseboardFill} strokeWidth="2" />
          </g>
        </g>

        {/* ── Back-Right Wall ── */}
        <g className="wall-back-right">
          <polygon
            points={`${originX},${originY} ${wallRightFloor.x},${wallRightFloor.y} ${wallRightTop.x},${wallRightTop.y} ${wallCornerTop.x},${wallCornerTop.y}`}
            fill={palette.wallFillRight}
            stroke={palette.wallStroke}
            strokeWidth="1.5"
          />
          {/* Wall Baseboard Trim */}
          <polygon
            points={`${originX},${originY} ${wallRightFloor.x},${wallRightFloor.y} ${wallRightFloor.x},${wallRightFloor.y - 12} ${originX},${originY - 12}`}
            fill={palette.baseboardFill}
            opacity="0.7"
          />

          {/* Hanging Picture Frame on Back-Right Wall */}
          <g transform={`translate(${originX + 80}, ${originY - 105}) skewY(-26.5)`}>
            <rect
              x="0"
              y="0"
              width="44"
              height="34"
              rx="3"
              fill="#d97706"
              stroke={palette.baseboardFill}
              strokeWidth="2"
            />
            <rect x="4" y="4" width="36" height="26" fill="#fef3c7" />
            <circle cx="22" cy="17" r="6" fill="#f59e0b" />
          </g>
        </g>

        {/* ── 2.5D Isometric Floor Grid ── */}
        <g className="floor-tileset">
          {Array.from({ length: GRID_SIZE }).map((_, col) =>
            Array.from({ length: GRID_SIZE }).map((__, row) => {
              const top = toScreen(col, row);
              const right = toScreen(col + 1, row);
              const bottom = toScreen(col + 1, row + 1);
              const left = toScreen(col, row + 1);
              const isEven = (col + row) % 2 === 0;

              return (
                <polygon
                  key={`tile-${col}-${row}`}
                  points={`${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`}
                  fill={isEven ? palette.floorFillLight : palette.floorFillDark}
                  stroke={palette.floorStroke}
                  strokeWidth="0.8"
                />
              );
            }),
          )}
          {/* Ambient Lighting Overlay on the floor */}
          <polygon
            points={`${originX},${originY} ${wallRightFloor.x},${wallRightFloor.y} ${floorBottom.x},${floorBottom.y} ${wallLeftFloor.x},${wallLeftFloor.y}`}
            fill="url(#floor-ambient)"
            pointerEvents="none"
          />
        </g>

        {/* ── Cutaway Foreground Trim (Low Profile Border) ── */}
        <g className="cutaway-foreground-trim" pointerEvents="none">
          {/* Left front cutaway sill */}
          <polygon
            points={`${wallLeftFloor.x},${wallLeftFloor.y} ${floorBottom.x},${floorBottom.y} ${floorBottom.x},${floorBottom.y + 14} ${wallLeftFloor.x},${wallLeftFloor.y + 14}`}
            fill={palette.baseboardFill}
            stroke={palette.wallStroke}
            strokeWidth="1"
          />
          {/* Right front cutaway sill */}
          <polygon
            points={`${floorBottom.x},${floorBottom.y} ${wallRightFloor.x},${wallRightFloor.y} ${wallRightFloor.x},${wallRightFloor.y + 14} ${floorBottom.x},${floorBottom.y + 14}`}
            fill={palette.wallFillLeft}
            stroke={palette.wallStroke}
            strokeWidth="1"
          />
        </g>

        {/* ── Layer 3: Kenney 2D Furniture Kit Props (Depth-Sorted) ── */}
        <FurnitureLayer
          furniture={furniture}
          originX={originX}
          originY={originY}
          tileWidth={TILE_WIDTH}
          tileHeight={TILE_HEIGHT}
          onPropClick={handlePropClick}
        />
      </svg>

      {/* Selected prop indicator toast */}
      {selectedPropId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 z-30 px-3 py-1.5 rounded-xl bg-amber-950/80 backdrop-blur-md border border-amber-500/30 text-amber-200 text-xs font-semibold shadow-lg"
        >
          {furniture.find((f) => f.id === selectedPropId)?.name ?? 'Furniture Prop'}
        </motion.div>
      )}
    </div>
  );
}
