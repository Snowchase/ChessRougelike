/**
 * formations.ts — Enemy formation definitions for Act 1
 *
 * Each formation describes:
 *   - Which enemy pieces to place and where (rows 0–2, enemy territory)
 *   - Which AI script governs their behavior
 *   - How much gold the player earns for winning
 */

import { PieceType, EnemyScript } from './types';
import { GUARD_SCRIPT, RUSHER_SCRIPT, ELITE_SCRIPT, BOSS_SCRIPT } from './enemy-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormationPiece {
  type: PieceType;
  row: number;
  col: number;
}

export interface EnemyFormation {
  id: string;
  name: string;
  description: string;
  pieces: FormationPiece[];
  script: EnemyScript;
  goldReward: number;
  isElite?: boolean;
  isBoss?: boolean;
}

// ─── Normal Formations ────────────────────────────────────────────────────────

export const NORMAL_FORMATIONS: EnemyFormation[] = [
  {
    id: 'skulk_patrol',
    name: 'Skulk Patrol',
    description: 'A mix of Rogues and a Guardian — watch the flanks.',
    pieces: [
      { type: 'HERO',     row: 0, col: 4 },
      { type: 'GUARDIAN', row: 0, col: 6 },
      { type: 'ROGUE',    row: 1, col: 2 },
      { type: 'ROGUE',    row: 1, col: 3 },
      { type: 'ROGUE',    row: 1, col: 5 },
      { type: 'ROGUE',    row: 1, col: 6 },
    ],
    script: GUARD_SCRIPT,
    goldReward: 15,
  },
  {
    id: 'raider_band',
    name: 'Raider Band',
    description: 'Fast Brawlers who rush down without mercy.',
    pieces: [
      { type: 'HERO',    row: 0, col: 3 },
      { type: 'BRAWLER', row: 0, col: 5 },
      { type: 'BRAWLER', row: 0, col: 6 },
      { type: 'ROGUE',   row: 1, col: 2 },
      { type: 'ROGUE',   row: 1, col: 4 },
      { type: 'ROGUE',   row: 1, col: 6 },
    ],
    script: RUSHER_SCRIPT,
    goldReward: 15,
  },
  {
    id: 'archer_line',
    name: 'Archer Line',
    description: 'Rangers backed by Rogues — control the diagonals.',
    pieces: [
      { type: 'HERO',   row: 0, col: 4 },
      { type: 'RANGER', row: 0, col: 2 },
      { type: 'RANGER', row: 0, col: 6 },
      { type: 'ROGUE',  row: 1, col: 2 },
      { type: 'ROGUE',  row: 1, col: 4 },
      { type: 'ROGUE',  row: 1, col: 6 },
    ],
    script: GUARD_SCRIPT,
    goldReward: 15,
  },
];

// ─── Elite Formations ─────────────────────────────────────────────────────────

export const ELITE_FORMATIONS: EnemyFormation[] = [
  {
    id: 'heavy_guard',
    name: 'Heavy Guard',
    description: 'Fortified defenders with a Ranger in reserve. Crack the shell.',
    pieces: [
      { type: 'HERO',     row: 0, col: 4 },
      { type: 'GUARDIAN', row: 0, col: 3 },
      { type: 'GUARDIAN', row: 0, col: 5 },
      { type: 'BRAWLER',  row: 0, col: 1 },
      { type: 'BRAWLER',  row: 0, col: 7 },
      { type: 'RANGER',   row: 1, col: 4 },
    ],
    script: ELITE_SCRIPT,
    goldReward: 25,
    isElite: true,
  },
  {
    id: 'shadow_cell',
    name: 'Shadow Cell',
    description: 'Four Rogues shielding a Witch. Beware the magic.',
    pieces: [
      { type: 'HERO',  row: 0, col: 3 },
      { type: 'WITCH', row: 0, col: 5 },
      { type: 'ROGUE', row: 1, col: 2 },
      { type: 'ROGUE', row: 1, col: 3 },
      { type: 'ROGUE', row: 1, col: 4 },
      { type: 'ROGUE', row: 1, col: 5 },
    ],
    script: ELITE_SCRIPT,
    goldReward: 25,
    isElite: true,
  },
];

// ─── Boss Formation ───────────────────────────────────────────────────────────

export const BOSS_FORMATION: EnemyFormation = {
  id: 'warlord_command',
  name: "Warlord's Command",
  description: 'The Act 1 boss. A full formation with no weak links. Defeat all to claim the act.',
  pieces: [
    { type: 'HERO',     row: 0, col: 4 },
    { type: 'GUARDIAN', row: 0, col: 2 },
    { type: 'GUARDIAN', row: 0, col: 6 },
    { type: 'WITCH',    row: 0, col: 7 },
    { type: 'RANGER',   row: 1, col: 2 },
    { type: 'RANGER',   row: 1, col: 6 },
    { type: 'BRAWLER',  row: 1, col: 4 },
  ],
  script: BOSS_SCRIPT,
  goldReward: 50,
  isBoss: true,
};

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const ALL_FORMATIONS: EnemyFormation[] = [
  ...NORMAL_FORMATIONS,
  ...ELITE_FORMATIONS,
  BOSS_FORMATION,
];

export function getFormationById(id: string): EnemyFormation | undefined {
  return ALL_FORMATIONS.find(f => f.id === id);
}
