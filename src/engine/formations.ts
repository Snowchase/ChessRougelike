/**
 * formations.ts — Enemy formation definitions for Act 1
 *
 * Each formation describes:
 *   - Which enemy pieces to place and where (rows 0–2, enemy territory)
 *   - Which AI script governs their behavior
 *   - How much gold the player earns for winning
 */

import { PieceType, EnemyScript, BoardLayout, LevelType, WinCondition } from './types';
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
  // Board shape & win condition — omit for default 8×8 / eliminate_all
  layout?: BoardLayout;
  levelType?: LevelType;
  winCondition?: WinCondition;
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

// ─── Special Level Formations ─────────────────────────────────────────────────

/** 6×6 cramped arena — survive 5 enemy turns to escape. */
export const GAUNTLET_FORMATION: EnemyFormation = {
  id: 'meat_grinder',
  name: 'The Meat Grinder',
  description: 'A small, brutal arena. Survive 5 enemy turns to break free.',
  pieces: [
    { type: 'HERO',    row: 0, col: 2 },
    { type: 'BRAWLER', row: 0, col: 3 },
    { type: 'ROGUE',   row: 1, col: 1 },
    { type: 'ROGUE',   row: 1, col: 2 },
    { type: 'ROGUE',   row: 1, col: 3 },
    { type: 'ROGUE',   row: 1, col: 4 },
  ],
  script: RUSHER_SCRIPT,
  goldReward: 20,
  layout: { rows: 6, cols: 6 },
  levelType: 'gauntlet',
  winCondition: { type: 'survive_turns', turns: 5 },
};

/** 8×4 narrow corridor — close-quarters elimination fight. */
export const CORRIDOR_FORMATION: EnemyFormation = {
  id: 'iron_corridor',
  name: 'Iron Corridor',
  description: 'A narrow passage with no room to breathe. Brute force wins here.',
  pieces: [
    { type: 'HERO',     row: 0, col: 1 },
    { type: 'GUARDIAN', row: 0, col: 2 },
    { type: 'ROGUE',    row: 1, col: 0 },
    { type: 'ROGUE',    row: 1, col: 3 },
    { type: 'BRAWLER',  row: 2, col: 1 },
  ],
  script: GUARD_SCRIPT,
  goldReward: 18,
  layout: { rows: 8, cols: 4 },
  levelType: 'corridor',
};

/** 6×6 with lava channels — lava deals 1 damage on landing. */
export const LAVA_PIT_FORMATION: EnemyFormation = {
  id: 'forge_of_ruin',
  name: 'Forge of Ruin',
  description: 'Lava channels split the battlefield. Step wrong and burn.',
  pieces: [
    { type: 'HERO',   row: 0, col: 2 },
    { type: 'RANGER', row: 0, col: 0 },
    { type: 'RANGER', row: 0, col: 4 },
    { type: 'ROGUE',  row: 1, col: 1 },
    { type: 'ROGUE',  row: 1, col: 3 },
  ],
  script: GUARD_SCRIPT,
  goldReward: 22,
  layout: {
    rows: 6,
    cols: 6,
    tiles: [
      { row: 2, col: 2, type: 'LAVA' },
      { row: 2, col: 3, type: 'LAVA' },
      { row: 3, col: 2, type: 'LAVA' },
      { row: 3, col: 3, type: 'LAVA' },
    ],
  },
  levelType: 'lava_pit',
};

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const ALL_FORMATIONS: EnemyFormation[] = [
  ...NORMAL_FORMATIONS,
  ...ELITE_FORMATIONS,
  BOSS_FORMATION,
  GAUNTLET_FORMATION,
  CORRIDOR_FORMATION,
  LAVA_PIT_FORMATION,
];

export function getFormationById(id: string): EnemyFormation | undefined {
  return ALL_FORMATIONS.find(f => f.id === id);
}
