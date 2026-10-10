'use client';

/**
 * @module components/dollhouse/FurnitureLayer
 *
 * Populates the 2.5D dollhouse room interior with Kenney 2D Furniture Kit props
 * (desks, lamps, seating, storage, and cozy decor).
 * Renders objects with isometric depth sorting ((col + row) * 100 + z).
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { FurnitureProp } from './types';

interface FurnitureLayerProps {
  furniture: FurnitureProp[];
  originX: number;
  originY: number;
  tileWidth: number;
  tileHeight: number;
  onPropClick?: (prop: FurnitureProp) => void;
}

export function FurnitureLayer({
  furniture,
  originX,
  originY,
  tileWidth,
  tileHeight,
  onPropClick,
}: FurnitureLayerProps) {
  // Sort back-to-front by isometric depth: row + col
  const sortedFurniture = [...furniture].sort((a, b) => {
    const depthA = (a.gridPos.col + a.gridPos.row) * 100 + (a.gridPos.z ?? 0);
    const depthB = (b.gridPos.col + b.gridPos.row) * 100 + (b.gridPos.z ?? 0);
    return depthA - depthB;
  });

  return (
    <g className="dollhouse-furniture-layer">
      {sortedFurniture.map((item) => {
        const { col, row, z = 0 } = item.gridPos;
        // Isometric screen coordinates (center of tile)
        const screenX = originX + (col - row) * (tileWidth / 2);
        const screenY = originY + (col + row) * (tileHeight / 2) - z;

        return (
          <g
            key={item.id}
            transform={`translate(${screenX}, ${screenY})`}
            onClick={() => onPropClick?.(item)}
            className={item.interactive ? 'cursor-pointer' : undefined}
          >
            {renderFurnitureSprite(item.spriteType)}
          </g>
        );
      })}
    </g>
  );
}

function renderFurnitureSprite(spriteType: FurnitureProp['spriteType']) {
  switch (spriteType) {
    case 'cozy_rug_woven':
      // Diamond flat isometric rug on the floor
      return (
        <g opacity="0.9">
          <polygon
            points="0,-16 48,8 0,32 -48,8"
            fill="#a16207"
            stroke="#78350f"
            strokeWidth="1.5"
          />
          <polygon
            points="0,-11 38,8 0,27 -38,8"
            fill="#d97706"
            stroke="#b45309"
            strokeWidth="1"
          />
          <polygon points="0,-4 18,8 0,20 -18,8" fill="#fef3c7" opacity="0.8" />
        </g>
      );

    case 'desk_wooden':
      // 2.5D Isometric study desk with drawers
      return (
        <g>
          {/* Shadow */}
          <ellipse cx="0" cy="8" rx="30" ry="14" fill="#000000" opacity="0.25" />
          {/* Desk Base / Legs */}
          <polygon points="-26,-4 -26,12 -18,16 -18,0" fill="#78350f" />
          <polygon points="18,0 18,16 26,12 26,-4" fill="#78350f" />
          <polygon points="-18,2 -18,18 18,18 18,2" fill="#5c290d" />
          {/* Desk Surface (isometric diamond) */}
          <polygon
            points="0,-24 32,-8 0,8 -32,-8"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="1"
          />
          {/* Desk Top Chamfer Edge */}
          <polygon points="-32,-8 0,8 0,11 -32,-5" fill="#92400e" />
          <polygon points="0,8 32,-8 32,-5 0,11" fill="#78350f" />
          {/* Paper / notebook prop */}
          <polygon points="-6,-12 4,-7 1,-4 -9,-9" fill="#fef3c7" />
        </g>
      );

    case 'coffee_table':
      return (
        <g>
          <ellipse cx="0" cy="6" rx="22" ry="11" fill="#000000" opacity="0.25" />
          {/* Table Legs */}
          <line x1="-14" y1="-2" x2="-14" y2="8" stroke="#78350f" strokeWidth="2.5" />
          <line x1="14" y1="-2" x2="14" y2="8" stroke="#78350f" strokeWidth="2.5" />
          <line x1="0" y1="4" x2="0" y2="12" stroke="#5c290d" strokeWidth="2.5" />
          {/* Table top */}
          <ellipse cx="0" cy="-6" rx="20" ry="10" fill="#d97706" stroke="#92400e" strokeWidth="1" />
          <ellipse cx="0" cy="-8" rx="19" ry="9" fill="#b45309" />
        </g>
      );

    case 'armchair_amber':
      // Plush cozy tufted armchair
      return (
        <g>
          {/* Shadow */}
          <ellipse cx="0" cy="12" rx="22" ry="12" fill="#000000" opacity="0.25" />
          {/* Chair Backrest */}
          <polygon
            points="-18,-32 0,-42 18,-32 18,-14 -18,-14"
            fill="#d97706"
            stroke="#92400e"
            strokeWidth="1"
          />
          {/* Backrest Cushion Tufting */}
          <circle cx="-6" cy="-26" r="1.5" fill="#78350f" />
          <circle cx="6" cy="-26" r="1.5" fill="#78350f" />
          <circle cx="0" cy="-20" r="1.5" fill="#78350f" />
          {/* Armrests */}
          <polygon points="-24,-16 -16,-12 -16,4 -24,0" fill="#b45309" />
          <polygon points="16,-12 24,-16 24,0 16,4" fill="#b45309" />
          {/* Seat Cushion */}
          <polygon
            points="0,-16 18,-6 0,4 -18,-6"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1"
          />
          {/* Seat Bottom Skirt */}
          <polygon points="-18,-6 0,4 0,9 -18,-1" fill="#b45309" />
          <polygon points="0,4 18,-6 18,-1 0,9" fill="#92400e" />
        </g>
      );

    case 'chair_cozy':
      // Wood frame study chair
      return (
        <g>
          <ellipse cx="0" cy="8" rx="14" ry="7" fill="#000000" opacity="0.2" />
          {/* Legs */}
          <line x1="-10" y1="0" x2="-10" y2="10" stroke="#78350f" strokeWidth="2" />
          <line x1="10" y1="0" x2="10" y2="10" stroke="#78350f" strokeWidth="2" />
          {/* Back slats */}
          <line x1="-8" y1="-22" x2="-8" y2="-4" stroke="#92400e" strokeWidth="2" />
          <line x1="8" y1="-22" x2="8" y2="-4" stroke="#92400e" strokeWidth="2" />
          <polygon points="-10,-24 0,-28 10,-24 10,-20 -10,-20" fill="#78350f" />
          {/* Seat */}
          <polygon points="0,-10 12,-3 0,4 -12,-3" fill="#b45309" stroke="#78350f" strokeWidth="1" />
        </g>
      );

    case 'lamp_floor_glowing':
      // Tall floor lamp with glowing lamp-shade and ambient halo
      return (
        <g>
          {/* Ambient Light Halo on the floor and wall */}
          <ellipse cx="0" cy="8" rx="36" ry="18" fill="#fef08a" opacity="0.18" />
          <ellipse cx="0" cy="-44" rx="28" ry="28" fill="#fef08a" opacity="0.22" />
          {/* Base */}
          <ellipse cx="0" cy="6" rx="10" ry="5" fill="#ca8a04" stroke="#854d0e" strokeWidth="1" />
          {/* Pole */}
          <line x1="0" y1="5" x2="0" y2="-40" stroke="#ca8a04" strokeWidth="2.5" />
          {/* Lamp Shade */}
          <polygon
            points="-14,-40 0,-48 14,-40 11,-56 -11,-56"
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth="1"
          />
          {/* Inner bulb warmth */}
          <circle cx="0" cy="-42" r="3.5" fill="#fef08a" />
        </g>
      );

    case 'lamp_desk':
      // Small brass gooseneck lamp on desk
      return (
        <g>
          {/* Light pool */}
          <ellipse cx="6" cy="4" rx="14" ry="7" fill="#fef08a" opacity="0.25" />
          <ellipse cx="-4" cy="0" rx="4" ry="2" fill="#ca8a04" />
          <path d="M -4 0 Q -2 -14 6 -10" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
          <polygon points="4,-14 9,-11 7,-6 2,-9" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
        </g>
      );

    case 'bookshelf_wood':
      // Tall multi-shelf bookcase with colorful books
      return (
        <g>
          {/* Base shadow */}
          <polygon points="0,12 20,2 0,-8 -20,2" fill="#000000" opacity="0.25" />
          {/* Side Panels */}
          <polygon points="-16,-62 -16,4 -22,1 -22,-65" fill="#78350f" />
          <polygon points="16,-62 16,4 22,1 22,-65" fill="#5c290d" />
          <polygon points="-16,-62 0,-70 16,-62 16,4 0,-4 -16,4" fill="#92400e" />
          {/* Shelves */}
          <polygon points="-16,-44 0,-52 16,-44 16,-42 0,-50 -16,-42" fill="#b45309" />
          <polygon points="-16,-24 0,-32 16,-24 16,-22 0,-30 -16,-22" fill="#b45309" />
          <polygon points="-16,-4 0,-12 16,-4 16,-2 0,-10 -16,-2" fill="#b45309" />
          {/* Colorful Book Spines */}
          <rect x="-12" y="-40" width="3" height="12" fill="#ef4444" />
          <rect x="-8" y="-38" width="3" height="10" fill="#3b82f6" />
          <rect x="-4" y="-41" width="3.5" height="13" fill="#10b981" />
          <rect x="2" y="-39" width="3" height="11" fill="#f59e0b" />
          <rect x="7" y="-40" width="4" height="12" fill="#8b5cf6" />
          {/* Bottom Shelf Books */}
          <rect x="-10" y="-20" width="3.5" height="12" fill="#06b6d4" />
          <rect x="-5" y="-19" width="3" height="11" fill="#ec4899" />
          <rect x="1" y="-21" width="4" height="13" fill="#eab308" />
        </g>
      );

    case 'potted_monstera':
      // Potted houseplant with lush split leaves
      return (
        <g>
          <ellipse cx="0" cy="6" rx="10" ry="5" fill="#000000" opacity="0.25" />
          {/* Ceramic Pot */}
          <polygon points="-8,-4 8,-4 6,6 -6,6" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="1" />
          <ellipse cx="0" cy="-4" rx="8" ry="3" fill="#451a03" />
          {/* Stems & Leaves */}
          <path d="M 0 -4 Q -10 -18 -16 -12" fill="none" stroke="#15803d" strokeWidth="1.5" />
          <ellipse cx="-16" cy="-12" rx="7" ry="4" fill="#22c55e" transform="rotate(-30 -16 -12)" />
          <path d="M 0 -4 Q 8 -22 14 -16" fill="none" stroke="#15803d" strokeWidth="1.5" />
          <ellipse cx="14" cy="-16" rx="8" ry="4" fill="#16a34a" transform="rotate(25 14 -16)" />
          <path d="M 0 -4 Q 0 -26 -2 -22" fill="none" stroke="#15803d" strokeWidth="1.5" />
          <ellipse cx="-2" cy="-22" rx="8" ry="5" fill="#4ade80" />
        </g>
      );

    case 'steaming_mug':
      return (
        <g>
          {/* Saucer / Mug shadow */}
          <ellipse cx="0" cy="2" rx="6" ry="3" fill="#000000" opacity="0.3" />
          {/* Ceramic Mug */}
          <rect x="-4" y="-6" width="8" height="7" rx="1" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
          <ellipse cx="0" cy="-6" rx="4" ry="1.5" fill="#78350f" />
          <path d="M 4 -4 Q 7 -3 4 -1" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          {/* Rising steam */}
          <motion.path
            d="M -1 -8 Q 1 -12 -1 -16"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1"
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>
      );

    case 'cushioned_bed':
      // Isometric single bed with folded duvet and soft pillow
      return (
        <g>
          <ellipse cx="0" cy="16" rx="34" ry="17" fill="#000000" opacity="0.25" />
          {/* Headboard */}
          <polygon points="-24,-38 0,-50 14,-43 14,-22 -24,-17" fill="#78350f" stroke="#5c290d" strokeWidth="1" />
          {/* Mattress Base */}
          <polygon points="-24,-18 14,-37 38,-25 0,-6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          {/* Wood Frame */}
          <polygon points="-24,-18 0,-6 0,6 -24,-6" fill="#92400e" />
          <polygon points="0,-6 38,-25 38,-13 0,6" fill="#78350f" />
          {/* Soft Pillow */}
          <polygon points="-16,-28 -4,-34 6,-29 -6,-23" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          {/* Cozy Duvet / Blanket */}
          <polygon points="-10,-12 18,-26 36,-17 8,-3" fill="#d97706" stroke="#b45309" strokeWidth="1" />
          <polygon points="8,-3 36,-17 36,-13 8,1" fill="#92400e" />
        </g>
      );

    case 'wardrobe_cabinet':
      return (
        <g>
          <polygon points="0,10 18,1 0,-8 -18,1" fill="#000000" opacity="0.25" />
          {/* Side panel */}
          <polygon points="-16,-56 -16,2 -22,-1 -22,-59" fill="#78350f" />
          <polygon points="-16,-56 0,-64 16,-56 16,2 0,10 -16,2" fill="#92400e" stroke="#78350f" strokeWidth="1" />
          {/* Doors */}
          <line x1="0" y1="-64" x2="0" y2="10" stroke="#78350f" strokeWidth="1.5" />
          {/* Handles */}
          <circle cx="-3" cy="-26" r="1.5" fill="#ca8a04" />
          <circle cx="3" cy="-26" r="1.5" fill="#ca8a04" />
        </g>
      );

    default:
      return null;
  }
}
