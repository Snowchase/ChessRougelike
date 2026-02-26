/**
 * run.ts — Run State Model
 *
 * The RunState persists across all nodes in a run:
 *   - Player vitals (HP, gold)
 *   - Current deck and relics
 *   - Overworld position (navigating the 7×7 dungeon grid)
 *   - Piece upgrades earned mid-run
 */

import { MoveCard, PieceType, UpgradeType } from './types';
import { ALL_CARDS } from './cards';
import { OverworldGrid, generateOverworld, revealAround, markVisited, GRID_SIZE } from './overworld';

// ─── Player Classes ───────────────────────────────────────────────────────────

export type PlayerClass = 'KNIGHT_GAMBIT' | 'PAWN_STORM' | 'BISHOP_BLESSING';

export interface ClassStartingPiece {
  idSuffix: string;
  type: PieceType;
  row: number;
  col: number;
}

export interface ClassDefinition {
  id: PlayerClass;
  name: string;
  description: string;
  emoji: string;
  startingPlayerPieces: ClassStartingPiece[];
  bonusCardIds: string[];      // extra cards added to starting deck beyond the 2× common set
  startingRelicIds: string[];
  startingHp: number;
  maxHp: number;
}

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  {
    id: 'KNIGHT_GAMBIT',
    name: "Knight's Gambit",
    description: 'Aggressive L-shaped strikes. Chain captures to build overwhelming momentum.',
    emoji: '♞',
    startingPlayerPieces: [
      { idSuffix: 'king',    type: 'KING',   row: 7, col: 4 },
      { idSuffix: 'knight1', type: 'KNIGHT', row: 7, col: 1 },
      { idSuffix: 'knight2', type: 'KNIGHT', row: 7, col: 6 },
      { idSuffix: 'rook',    type: 'ROOK',   row: 7, col: 0 },
      { idSuffix: 'pawn1',   type: 'PAWN',   row: 6, col: 2 },
      { idSuffix: 'pawn2',   type: 'PAWN',   row: 6, col: 3 },
      { idSuffix: 'pawn3',   type: 'PAWN',   row: 6, col: 4 },
    ],
    bonusCardIds: ['midnight_ride'],
    startingRelicIds: ['blood_pawn'],
    startingHp: 22,
    maxHp: 22,
  },
  {
    id: 'PAWN_STORM',
    name: 'Pawn Storm',
    description: 'Advance en masse. Overwhelm with numbers and build unstoppable combo chains.',
    emoji: '♙',
    startingPlayerPieces: [
      { idSuffix: 'king',   type: 'KING',   row: 7, col: 4 },
      { idSuffix: 'bishop', type: 'BISHOP', row: 7, col: 2 },
      { idSuffix: 'pawn1',  type: 'PAWN',   row: 6, col: 1 },
      { idSuffix: 'pawn2',  type: 'PAWN',   row: 6, col: 2 },
      { idSuffix: 'pawn3',  type: 'PAWN',   row: 6, col: 3 },
      { idSuffix: 'pawn4',  type: 'PAWN',   row: 6, col: 4 },
      { idSuffix: 'pawn5',  type: 'PAWN',   row: 6, col: 5 },
    ],
    bonusCardIds: ['push'],
    startingRelicIds: ['zwischenzug'],
    startingHp: 18,
    maxHp: 18,
  },
  {
    id: 'BISHOP_BLESSING',
    name: "Bishop's Blessing",
    description: 'Long-range diagonals and poison. Control the board from a distance.',
    emoji: '♝',
    startingPlayerPieces: [
      { idSuffix: 'king',    type: 'KING',   row: 7, col: 4 },
      { idSuffix: 'bishop1', type: 'BISHOP', row: 7, col: 2 },
      { idSuffix: 'bishop2', type: 'BISHOP', row: 7, col: 5 },
      { idSuffix: 'knight',  type: 'KNIGHT', row: 7, col: 1 },
      { idSuffix: 'pawn1',   type: 'PAWN',   row: 6, col: 2 },
      { idSuffix: 'pawn2',   type: 'PAWN',   row: 6, col: 4 },
      { idSuffix: 'pawn3',   type: 'PAWN',   row: 6, col: 6 },
    ],
    bonusCardIds: ['dark_prayer'],
    startingRelicIds: ['poisoned_bishop'],
    startingHp: 20,
    maxHp: 20,
  },
];

// ─── Piece Upgrade Registry ───────────────────────────────────────────────────

export interface UpgradeDefinition {
  id: UpgradeType;
  pieceType: PieceType;
  name: string;
  description: string;
  emoji: string;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'PROMOTED',
    pieceType: 'PAWN',
    name: 'Promoted Pawn',
    description: 'Can move diagonally without capturing.',
    emoji: '⭐',
  },
  {
    id: 'NIGHTMARE',
    pieceType: 'KNIGHT',
    name: 'Nightmare Knight',
    description: 'Hits every square along the L-path.',
    emoji: '🌙',
  },
  {
    id: 'SIEGE',
    pieceType: 'ROOK',
    name: 'Siege Tower',
    description: "Captures don't end your turn.",
    emoji: '🏰',
  },
  {
    id: 'DARK_BISHOP',
    pieceType: 'BISHOP',
    name: 'Dark Bishop',
    description: 'Can capture on both square colors.',
    emoji: '🌑',
  },
];

// ─── Persistent Piece Upgrade Record ─────────────────────────────────────────

export interface PieceUpgradeRecord {
  pieceType: PieceType;
  upgrade: UpgradeType;
}

// ─── Run State ────────────────────────────────────────────────────────────────

export interface RunState {
  playerClass: PlayerClass;
  hp: number;
  maxHp: number;
  gold: number;
  deck: MoveCard[];
  relicIds: string[];
  pieceUpgrades: PieceUpgradeRecord[];

  // Overworld navigation
  grid: OverworldGrid;
  playerRow: number;
  playerCol: number;

  act: number;
  runOver: boolean;
  victory: boolean;
}

// ─── Run Actions ──────────────────────────────────────────────────────────────

export type RunAction =
  | { type: 'START_RUN'; playerClass: PlayerClass }
  | { type: 'MOVE_TO'; row: number; col: number }
  | { type: 'COMPLETE_TILE'; finalHp: number; goldEarned: number }
  | { type: 'RUN_LOST'; finalHp: number }
  | { type: 'ADD_CARD'; card: MoveCard }
  | { type: 'BUY_CARD'; card: MoveCard; cost: number }
  | { type: 'BUY_RELIC'; relicId: string; cost: number }
  | { type: 'HEAL'; amount: number; cost: number }
  | { type: 'APPLY_UPGRADE'; pieceType: PieceType; upgrade: UpgradeType };

// ─── Starting Deck Builder ────────────────────────────────────────────────────

function buildStartingDeckForClass(classDef: ClassDefinition): MoveCard[] {
  const deck: MoveCard[] = [];
  const seen = new Set<string>();

  const pieceTypes = classDef.startingPlayerPieces.map(sp => sp.type);

  for (const type of pieceTypes) {
    const card = ALL_CARDS.find(c => c.pieceType === type && c.rarity === 'common');
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      deck.push({ ...card, id: `${card.id}_1` });
      deck.push({ ...card, id: `${card.id}_2` });
    }
  }

  for (const cardId of classDef.bonusCardIds) {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (card) {
      deck.push({ ...card, id: `${card.id}_bonus` });
    }
  }

  return deck;
}

// ─── Run Factory ──────────────────────────────────────────────────────────────

export function createInitialRunState(playerClass: PlayerClass): RunState {
  const classDef = CLASS_DEFINITIONS.find(c => c.id === playerClass)!;
  const deck = buildStartingDeckForClass(classDef);
  const grid = generateOverworld();

  return {
    playerClass,
    hp: classDef.startingHp,
    maxHp: classDef.maxHp,
    gold: 50,
    deck,
    relicIds: [...classDef.startingRelicIds],
    pieceUpgrades: [],
    grid,
    playerRow: 0,
    playerCol: 0,
    act: 1,
    runOver: false,
    victory: false,
  };
}

// ─── Run Reducer ──────────────────────────────────────────────────────────────

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'START_RUN':
      return createInitialRunState(action.playerClass);

    case 'MOVE_TO': {
      const { row, col } = action;
      // Move player, reveal fog around new position
      const newGrid = revealAround(state.grid, row, col);
      // Corridor tiles are complete on entry (no encounter)
      const tileType = newGrid[row][col].type;
      const completedGrid = (tileType === 'corridor' || tileType === 'start')
        ? markVisited(newGrid, row, col)
        : newGrid;
      return { ...state, grid: completedGrid, playerRow: row, playerCol: col };
    }

    case 'COMPLETE_TILE': {
      const { playerRow, playerCol } = state;
      const newGrid = markVisited(state.grid, playerRow, playerCol);
      return {
        ...state,
        hp: Math.min(action.finalHp, state.maxHp),
        gold: state.gold + action.goldEarned,
        grid: newGrid,
      };
    }

    case 'RUN_LOST':
      return { ...state, hp: action.finalHp, runOver: true, victory: false };

    case 'ADD_CARD':
      return { ...state, deck: [...state.deck, action.card] };

    case 'BUY_CARD': {
      if (state.gold < action.cost) return state;
      return {
        ...state,
        gold: state.gold - action.cost,
        deck: [...state.deck, action.card],
      };
    }

    case 'BUY_RELIC': {
      if (state.gold < action.cost) return state;
      if (state.relicIds.includes(action.relicId)) return state;
      return {
        ...state,
        gold: state.gold - action.cost,
        relicIds: [...state.relicIds, action.relicId],
      };
    }

    case 'HEAL': {
      if (state.gold < action.cost) return state;
      const newHp = Math.min(state.hp + action.amount, state.maxHp);
      return { ...state, hp: newHp, gold: state.gold - action.cost };
    }

    case 'APPLY_UPGRADE': {
      const existing = state.pieceUpgrades.find(u => u.pieceType === action.pieceType);
      if (existing) {
        return {
          ...state,
          pieceUpgrades: state.pieceUpgrades.map(u =>
            u.pieceType === action.pieceType
              ? { pieceType: action.pieceType, upgrade: action.upgrade }
              : u,
          ),
        };
      }
      return {
        ...state,
        pieceUpgrades: [
          ...state.pieceUpgrades,
          { pieceType: action.pieceType, upgrade: action.upgrade },
        ],
      };
    }

    default:
      return state;
  }
}
