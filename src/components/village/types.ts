/**
 * @module components/village/types
 *
 * Types for the Cozy Villages 2.5D Isometric Macro-Plot system.
 * Supports Kenney Isometric Buildings, Tiny Town terrain tiles, and member plot anchors.
 */

import type { VibeStatus } from '@/types/vibe';

export type VillageTileType =
  | 'grass_meadow'
  | 'cobblestone_path'
  | 'water_stream'
  | 'dirt_garden';

export type VillageBuildingType =
  | 'cottage_wood'
  | 'tiny_town_hall'
  | 'windmill'
  | 'stone_well'
  | 'market_stall'
  | 'cozy_tree';

export interface VillagePlotAnchor {
  id: string;
  label: string;
  col: number;
  row: number;
  occupiedByUserId?: string;
  occupiedByName?: string;
  avatarUrl?: string;
  vibeStatus?: VibeStatus;
}

export interface VillageBuilding {
  id: string;
  type: VillageBuildingType;
  col: number;
  row: number;
  z?: number;
}

export interface VillageMacroPlotProps {
  /** Size of isometric grid (default 8) */
  gridSize?: number;
  /** Village name / header */
  villageName?: string;
  /** Group / Village Vibe Status determining weather particles */
  vibeStatus?: VibeStatus;
  /** Anchored user plots in the village */
  plotAnchors?: VillagePlotAnchor[];
  /** Buildings in the village */
  buildings?: VillageBuilding[];
  /** On click plot anchor */
  onSelectPlot?: (plot: VillagePlotAnchor) => void;
  className?: string;
}
