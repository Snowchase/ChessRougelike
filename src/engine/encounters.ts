/**
 * encounters.ts — Enemy formation definitions
 *
 * Each encounter specifies:
 *   - Which enemy pieces appear on the board
 *   - Which AI script they follow
 *   - Gold reward range
 *   - Optional boss rules displayed to the player
 */

import { Piece, EnemyScript } from './types';
import { GUARD_SCRIPT, RUSHER_SCRIPT } from './enemy-ai';

// ─── Helper ───────────────────────────────────────────────────────────────────

function ep(id: string, type: Piece['type'], row: number, col: number): Piece {
  return {
    id,
    type,
    team: 'enemy',
    position: { row, col },
    upgrades: [],
    poisoned: false,
    hasMoved: false,
  };
}

// ─── Boss AI Script ───────────────────────────────────────────────────────────

const BOSS_SCRIPT: EnemyScript = {
  name: 'Iron King',
  steps: [
    { action: 'ADVANCE',  description: 'The Iron King advances with full force.' },
    { action: 'ATTACK',   description: 'The Iron King strikes at your weakest piece!' },
    { action: 'THREATEN', description: 'The Iron King repositions for a devastating fork.' },
    { action: 'ATTACK',   description: 'The Iron King unleashes a combo assault!' },
  ],
};

// ─── Encounter Definition ─────────────────────────────────────────────────────

export interface Encounter {
  id: string;
  name: string;
  description: string;
  tier: 'normal' | 'elite' | 'boss';
  enemyPieces: Piece[];
  script: EnemyScript;
  bossRule?: string;         // displayed to player at start of boss fight
  goldReward: { min: number; max: number };
}

// ─── Normal Encounters — Act 1 ────────────────────────────────────────────────

const normalFight1: Encounter = {
  id: 'normal_fight_1',
  name: 'Sentry Post',
  description: 'A pawn line backed by a rook and a king.',
  tier: 'normal',
  enemyPieces: [
    ep('e_king',  'KING', 0, 4),
    ep('e_rook',  'ROOK', 0, 7),
    ep('e_pawn1', 'PAWN', 1, 2),
    ep('e_pawn2', 'PAWN', 1, 4),
    ep('e_pawn3', 'PAWN', 1, 6),
  ],
  script: GUARD_SCRIPT,
  goldReward: { min: 8, max: 15 },
};

const normalFight2: Encounter = {
  id: 'normal_fight_2',
  name: 'Cavalry Rush',
  description: 'Two knights charging from the flanks.',
  tier: 'normal',
  enemyPieces: [
    ep('e_king',    'KING',   0, 4),
    ep('e_knight1', 'KNIGHT', 0, 1),
    ep('e_knight2', 'KNIGHT', 0, 6),
    ep('e_pawn1',   'PAWN',   1, 3),
    ep('e_pawn2',   'PAWN',   1, 5),
  ],
  script: RUSHER_SCRIPT,
  goldReward: { min: 8, max: 15 },
};

const normalFight3: Encounter = {
  id: 'normal_fight_3',
  name: 'Bishop Pair',
  description: 'Two bishops controlling the long diagonals.',
  tier: 'normal',
  enemyPieces: [
    ep('e_king',    'KING',   0, 4),
    ep('e_bishop1', 'BISHOP', 0, 2),
    ep('e_bishop2', 'BISHOP', 0, 6),
    ep('e_pawn1',   'PAWN',   1, 3),
    ep('e_pawn2',   'PAWN',   1, 4),
    ep('e_pawn3',   'PAWN',   1, 5),
  ],
  script: GUARD_SCRIPT,
  goldReward: { min: 8, max: 15 },
};

// ─── Elite Encounters — Act 1 ─────────────────────────────────────────────────

const eliteHeavyGuard: Encounter = {
  id: 'elite_heavy_guard',
  name: 'Heavy Guard',
  description: 'A queen-led formation with double rook coverage.',
  tier: 'elite',
  enemyPieces: [
    ep('e_king',  'KING',  0, 4),
    ep('e_queen', 'QUEEN', 0, 3),
    ep('e_rook1', 'ROOK',  0, 0),
    ep('e_rook2', 'ROOK',  0, 7),
    ep('e_pawn1', 'PAWN',  1, 2),
    ep('e_pawn2', 'PAWN',  1, 4),
    ep('e_pawn3', 'PAWN',  1, 6),
  ],
  script: GUARD_SCRIPT,
  goldReward: { min: 20, max: 30 },
};

const eliteBerserker: Encounter = {
  id: 'elite_berserker',
  name: 'Berserker',
  description: 'An all-out aggressive formation — will trade pieces freely.',
  tier: 'elite',
  enemyPieces: [
    ep('e_king',    'KING',   0, 4),
    ep('e_knight1', 'KNIGHT', 1, 1),
    ep('e_knight2', 'KNIGHT', 1, 6),
    ep('e_bishop1', 'BISHOP', 0, 2),
    ep('e_bishop2', 'BISHOP', 0, 6),
    ep('e_pawn1',   'PAWN',   2, 3),
    ep('e_pawn2',   'PAWN',   2, 5),
  ],
  script: RUSHER_SCRIPT,
  goldReward: { min: 20, max: 30 },
};

// ─── Boss Encounter — Act 1 ───────────────────────────────────────────────────

const act1Boss: Encounter = {
  id: 'act1_boss',
  name: 'The Iron King',
  description: 'A fully formed army — every piece type represented.',
  tier: 'boss',
  bossRule: 'Boss Rule: Enemy pieces are stronger and attack more aggressively.',
  enemyPieces: [
    ep('e_king',    'KING',   0, 4),
    ep('e_queen',   'QUEEN',  0, 3),
    ep('e_rook1',   'ROOK',   0, 0),
    ep('e_rook2',   'ROOK',   0, 7),
    ep('e_knight1', 'KNIGHT', 0, 1),
    ep('e_knight2', 'KNIGHT', 0, 6),
    ep('e_pawn1',   'PAWN',   1, 0),
    ep('e_pawn2',   'PAWN',   1, 2),
    ep('e_pawn3',   'PAWN',   1, 4),
    ep('e_pawn4',   'PAWN',   1, 6),
  ],
  script: BOSS_SCRIPT,
  goldReward: { min: 40, max: 60 },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ALL_ENCOUNTERS: Encounter[] = [
  normalFight1,
  normalFight2,
  normalFight3,
  eliteHeavyGuard,
  eliteBerserker,
  act1Boss,
];

export function getEncounter(id: string): Encounter | undefined {
  return ALL_ENCOUNTERS.find(e => e.id === id);
}

export function rollGold(encounter: Encounter): number {
  const { min, max } = encounter.goldReward;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
