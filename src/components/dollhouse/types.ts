/**
 * @module components/dollhouse/types
 *
 * TypeScript contracts for the Cozy Villages 2.5D Dollhouse system.
 * Defines isometric coordinate math, room themes, Kenney furniture props,
 * and Vibe Check weather aura configurations.
 */

import type { VibeStatus } from '@/types/vibe';

export type DollhouseRoomTheme = 'cottage' | 'campsite' | 'castle' | 'modern';

export interface IsometricCoord {
  /** Column on isometric grid [0..GRID_SIZE] */
  col: number;
  /** Row on isometric grid [0..GRID_SIZE] */
  row: number;
  /** Vertical elevation offset in pixels */
  z?: number;
}

export type FurnitureCategory =
  | 'desk'
  | 'seating'
  | 'lamp'
  | 'decor'
  | 'plant'
  | 'bed'
  | 'storage'
  | 'table';

export type FurnitureSpriteType =
  | 'desk_wooden'
  | 'chair_cozy'
  | 'armchair_amber'
  | 'lamp_floor_glowing'
  | 'lamp_desk'
  | 'bookshelf_wood'
  | 'potted_monstera'
  | 'cozy_rug_woven'
  | 'coffee_table'
  | 'steaming_mug'
  | 'cushioned_bed'
  | 'wardrobe_cabinet';

export interface FurnitureProp {
  id: string;
  name: string;
  category: FurnitureCategory;
  gridPos: IsometricCoord;
  spriteType: FurnitureSpriteType;
  /** Width span across columns (default 1) */
  colSpan?: number;
  /** Depth span across rows (default 1) */
  rowSpan?: number;
  interactive?: boolean;
}

export interface WeatherParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  type: 'sunbeam' | 'cloud' | 'leaf' | 'star' | 'rain' | 'steam' | 'fog';
}

export interface DollhouseStageProps {
  /** Room theme style palette */
  theme?: DollhouseRoomTheme | string;
  /** User's daily Vibe Check status driving ambient weather auras */
  vibeStatus?: VibeStatus;
  /** Optional custom furniture props */
  furniture?: FurnitureProp[];
  /** Container CSS classes */
  className?: string;
  /** Click callback for furniture props */
  onPropClick?: (prop: FurnitureProp) => void;
  /** Whether weather auras and particles are rendered */
  showWeatherAuras?: boolean;
  /** Interactive lighting toggle (day vs night) */
  nightMode?: boolean;
}
