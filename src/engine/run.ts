/**
 * run.ts — Run state model for Phase 2
 *
 * A "run" is the full session from class select → map → battles → death or victory.
 * This module owns:
 *   - Type definitions (RunState, MapNode, StartingClass, etc.)
 *   - Class definitions (starting loadouts)
 *   - Map generation (Act 1 branching path)
 *   - Run reducer (pure state transitions)
 */

import { MoveCard, RelicInstance, PieceType, UpgradeType } from './types';
import { ALL_CARDS, buildStartingDeck, shuffleDeck } from './cards';
import {
  NORMAL_FORMATIONS,
  ELITE_FORMATIONS,
  BOSS_FORMATION,
  EnemyFormation,
  ALL_FORMATIONS,
} from './formations';

// ─── Core Types ───────────────────────────────────────────────────────────────

export type StartingClass = 'WARRIOR' | 'RANGER' | 'TRICKSTER';

export type NodeType = 'normal' | 'elite' | 'shop' | 'rest' | 'event' | 'boss';

export interface PieceConfig {
  id: string;
  type: PieceType;
  upgrades: UpgradeType[];
}

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;
  col: number;
  formationId?: string;   // set for fight/elite/boss nodes
  connections: string[];  // ids of nodes this leads to in the next row
}

export interface RunState {
  playerHp: number;
  maxPlayerHp: number;
  gold: number;
  startingClass: StartingClass;

  deck: MoveCard[];
  relics: RelicInstance[];
  playerPieces: PieceConfig[];

  // Map
  map: MapNode[][];       // [row][col]
  currentNodeId: string | null; // null = at the entry, pick any row-0 node
  visitedNodeIds: string[];
  currentAct: number;

  // Stats
  battlesWon: number;
  isRunActive: boolean;
}

// ─── Class Definitions ────────────────────────────────────────────────────────

export interface ClassDefinition {
  id: StartingClass;
  name: string;
  tagline: string;
  description: string;
  startingHp: number;
  pieces: PieceType[];   // list of piece types; HERO must be first
  startingRelicIds: string[];
}

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  {
    id: 'WARRIOR',
    name: 'Warrior',
    tagline: 'The Stalwart Fortress',
    description: 'Your Guardians hold the line while Brawlers punch through. High HP, defensive power.',
    startingHp: 25,
    pieces: ['HERO', 'GUARDIAN', 'GUARDIAN', 'BRAWLER', 'BRAWLER', 'ROGUE'],
    startingRelicIds: ['blood_rogue'],
  },
  {
    id: 'RANGER',
    name: 'Ranger',
    tagline: 'The Swift Hunter',
    description: 'Strike from the shadows, poison your enemies, and sweep the field with diagonal fire.',
    startingHp: 20,
    pieces: ['HERO', 'RANGER', 'RANGER', 'ROGUE', 'ROGUE', 'BRAWLER'],
    startingRelicIds: ['envenomed_ranger'],
  },
  {
    id: 'TRICKSTER',
    name: 'Trickster',
    tagline: 'The Chaos Weaver',
    description: 'Combos are your currency. Build a chain of captures and watch the multipliers explode.',
    startingHp: 18,
    pieces: ['HERO', 'ROGUE', 'ROGUE', 'ROGUE', 'RANGER', 'WITCH'],
    startingRelicIds: ['zwischenzug'],
  },
];

// ─── Piece Upgrades ───────────────────────────────────────────────────────────

export interface UpgradeOption {
  upgrade: UpgradeType;
  targetType: PieceType;
  name: string;
  description: string;
}

export const UPGRADE_OPTIONS: UpgradeOption[] = [
  {
    upgrade: 'VETERAN',
    targetType: 'ROGUE',
    name: 'Veteran Rogue',
    description: 'Can move backward as well as forward.',
  },
  {
    upgrade: 'NIGHTMARE',
    targetType: 'BRAWLER',
    name: 'Nightmare Brawler',
    description: 'Strikes every square along the L-path on capture.',
  },
  {
    upgrade: 'SIEGE',
    targetType: 'GUARDIAN',
    name: 'Siege Guardian',
    description: "Captures don't end your turn — march and strike again.",
  },
  {
    upgrade: 'DARK_RANGER',
    targetType: 'RANGER',
    name: 'Dark Ranger',
    description: 'Can capture on both diagonal colors.',
  },
];

// ─── Map Generation ───────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeNode(
  id: string,
  type: NodeType,
  row: number,
  col: number,
  formationId?: string,
): MapNode {
  return { id, type, row, col, formationId, connections: [] };
}

/**
 * Generate the Act 1 map.
 *
 * Structure (6 rows):
 *   Row 0: 2 Normal fights
 *   Row 1: Normal, Shop, Normal
 *   Row 2: Normal, Elite, Rest
 *   Row 3: Shop, Normal
 *   Row 4: Elite, Rest
 *   Row 5: Boss
 */
function generateAct1Map(): MapNode[][] {
  const normals = shuffleArray([...NORMAL_FORMATIONS]);
  const elites  = shuffleArray([...ELITE_FORMATIONS]);
  let nIdx = 0;
  let eIdx = 0;

  const nextNormal = (): string => normals[nIdx++ % normals.length].id;
  const nextElite  = (): string => elites[eIdx++ % elites.length].id;

  const rows: MapNode[][] = [
    // Row 0
    [
      makeNode('n0_0', 'normal', 0, 0, nextNormal()),
      makeNode('n0_1', 'normal', 0, 1, nextNormal()),
    ],
    // Row 1
    [
      makeNode('n1_0', 'normal', 1, 0, nextNormal()),
      makeNode('n1_1', 'shop',   1, 1),
      makeNode('n1_2', 'normal', 1, 2, nextNormal()),
    ],
    // Row 2
    [
      makeNode('n2_0', 'normal', 2, 0, nextNormal()),
      makeNode('n2_1', 'elite',  2, 1, nextElite()),
      makeNode('n2_2', 'rest',   2, 2),
    ],
    // Row 3
    [
      makeNode('n3_0', 'shop',   3, 0),
      makeNode('n3_1', 'normal', 3, 1, nextNormal()),
    ],
    // Row 4
    [
      makeNode('n4_0', 'elite', 4, 0, nextElite()),
      makeNode('n4_1', 'rest',  4, 1),
    ],
    // Row 5 (Boss)
    [
      makeNode('n5_0', 'boss', 5, 0, BOSS_FORMATION.id),
    ],
  ];

  // Wire connections (each node lists which row+1 nodes it leads to)
  // Row 0 → Row 1
  rows[0][0].connections = ['n1_0', 'n1_1'];
  rows[0][1].connections = ['n1_1', 'n1_2'];

  // Row 1 → Row 2
  rows[1][0].connections = ['n2_0', 'n2_1'];
  rows[1][1].connections = ['n2_0', 'n2_1', 'n2_2'];
  rows[1][2].connections = ['n2_1', 'n2_2'];

  // Row 2 → Row 3
  rows[2][0].connections = ['n3_0', 'n3_1'];
  rows[2][1].connections = ['n3_0', 'n3_1'];
  rows[2][2].connections = ['n3_1'];

  // Row 3 → Row 4
  rows[3][0].connections = ['n4_0', 'n4_1'];
  rows[3][1].connections = ['n4_0', 'n4_1'];

  // Row 4 → Row 5
  rows[4][0].connections = ['n5_0'];
  rows[4][1].connections = ['n5_0'];

  return rows;
}

// ─── Run Factory ──────────────────────────────────────────────────────────────

export function createNewRun(startingClass: StartingClass): RunState {
  const classDef = CLASS_DEFINITIONS.find(c => c.id === startingClass)!;

  const playerPieces: PieceConfig[] = classDef.pieces.map((type, i) => ({
    id: `p_${i}`,
    type,
    upgrades: [],
  }));

  const deckUnsorted = buildStartingDeck(classDef.pieces);
  const deck = shuffleDeck(deckUnsorted);

  const relics: RelicInstance[] = classDef.startingRelicIds.map(relicId => ({
    relicId,
    counter: 0,
  }));

  return {
    playerHp: classDef.startingHp,
    maxPlayerHp: classDef.startingHp,
    gold: 0,
    startingClass,
    deck,
    relics,
    playerPieces,
    map: generateAct1Map(),
    currentNodeId: null,
    visitedNodeIds: [],
    currentAct: 1,
    battlesWon: 0,
    isRunActive: true,
  };
}

// ─── Map Helpers ──────────────────────────────────────────────────────────────

/** Return all nodes in the map as a flat list. */
export function allNodes(map: MapNode[][]): MapNode[] {
  const result: MapNode[] = [];
  for (const row of map) {
    for (const node of row) {
      result.push(node);
    }
  }
  return result;
}

/** Find a node by id. */
export function findNode(map: MapNode[][], id: string): MapNode | undefined {
  return allNodes(map).find(n => n.id === id);
}

/** Return which node ids are currently reachable from the player's position. */
export function getReachableNodeIds(map: MapNode[][], currentNodeId: string | null): string[] {
  if (currentNodeId === null) {
    // At entry — can pick any row-0 node
    return map[0].map(n => n.id);
  }
  const node = findNode(map, currentNodeId);
  return node?.connections ?? [];
}

/** Get the formation for a node (if it's a fight node). */
export function getNodeFormation(node: MapNode): EnemyFormation | undefined {
  if (!node.formationId) return undefined;
  return ALL_FORMATIONS.find(f => f.id === node.formationId);
}

// ─── Card Draft Pool ──────────────────────────────────────────────────────────

/**
 * Pick `count` random cards from ALL_CARDS for a draft reward.
 * Weighted: common 60%, uncommon 30%, rare 10%.
 */
export function getDraftPool(count: number): MoveCard[] {
  const weighted: MoveCard[] = [];
  for (const card of ALL_CARDS) {
    const copies =
      card.rarity === 'common'   ? 6 :
      card.rarity === 'uncommon' ? 3 : 1;
    for (let i = 0; i < copies; i++) weighted.push(card);
  }

  const picked: MoveCard[] = [];
  const usedIds = new Set<string>();
  const shuffled = shuffleArray(weighted);

  for (const card of shuffled) {
    if (!usedIds.has(card.id)) {
      usedIds.add(card.id);
      picked.push({ ...card, id: `draft_${card.id}_${Date.now()}_${picked.length}` });
      if (picked.length >= count) break;
    }
  }
  return picked;
}

/** Pick `count` random upgrades that are applicable to pieces the player has. */
export function getUpgradeOptions(playerPieces: PieceConfig[], count: number): UpgradeOption[] {
  const playerTypes = new Set(playerPieces.map(p => p.type));
  const applicable = UPGRADE_OPTIONS.filter(u => playerTypes.has(u.targetType));
  return shuffleArray(applicable).slice(0, count);
}

// ─── Shop Inventory ───────────────────────────────────────────────────────────

export interface ShopItem {
  id: string;
  kind: 'card' | 'relic' | 'upgrade';
  card?: MoveCard;
  relicId?: string;
  relicName?: string;
  relicDescription?: string;
  upgradeOption?: UpgradeOption;
  cost: number;
}

const CARD_COST: Record<string, number> = { common: 20, uncommon: 35, rare: 50 };
const RELIC_COST = 75;

export function generateShopInventory(playerPieces: PieceConfig[]): ShopItem[] {
  const items: ShopItem[] = [];

  // 3 cards
  const cardPool = getDraftPool(3);
  for (const card of cardPool) {
    items.push({
      id: `shop_card_${card.id}`,
      kind: 'card',
      card,
      cost: CARD_COST[card.rarity] ?? 30,
    });
  }

  // 1 relic (random from a small set)
  const relicChoices = [
    { id: 'fork',       name: 'Fork',            description: 'On Landing: if threatening 2+ enemies, draw a card.' },
    { id: 'blood_rogue', name: 'Blood Rogue',    description: 'On Capture: gain +1 HP.' },
    { id: 'zwischenzug', name: 'Zwischenzug',    description: 'Every 3rd capture doubles the combo step.' },
    { id: 'envenomed_ranger', name: 'Envenomed Ranger', description: 'Ranger captures poison diagonal enemies.' },
  ];
  const relic = relicChoices[Math.floor(Math.random() * relicChoices.length)];
  items.push({
    id: `shop_relic_${relic.id}`,
    kind: 'relic',
    relicId: relic.id,
    relicName: relic.name,
    relicDescription: relic.description,
    cost: RELIC_COST,
  });

  // 1 upgrade
  const upgOpts = getUpgradeOptions(playerPieces, 1);
  if (upgOpts.length > 0) {
    const u = upgOpts[0];
    items.push({
      id: `shop_upg_${u.upgrade}`,
      kind: 'upgrade',
      upgradeOption: u,
      cost: 50,
    });
  }

  return items;
}

// ─── Run Reducer ──────────────────────────────────────────────────────────────

export type RunAction =
  | { type: 'START_RUN';        startingClass: StartingClass }
  | { type: 'VISIT_NODE';       nodeId: string }
  | { type: 'COMPLETE_BATTLE';  goldEarned: number; hpAfterBattle: number }
  | { type: 'ADD_CARD';         card: MoveCard }
  | { type: 'ADD_RELIC';        relicId: string }
  | { type: 'UPGRADE_PIECE';    pieceId: string; upgrade: UpgradeType }
  | { type: 'SPEND_GOLD';       amount: number }
  | { type: 'HEAL';             amount: number }
  | { type: 'END_RUN' };

export function runReducer(state: RunState | null, action: RunAction): RunState | null {
  switch (action.type) {
    case 'START_RUN':
      return createNewRun(action.startingClass);
  }

  if (!state) return null;

  switch (action.type) {
    case 'VISIT_NODE':
      return {
        ...state,
        currentNodeId: action.nodeId,
        visitedNodeIds: [...state.visitedNodeIds, action.nodeId],
      };

    case 'COMPLETE_BATTLE':
      return {
        ...state,
        gold: state.gold + action.goldEarned,
        playerHp: action.hpAfterBattle,
        battlesWon: state.battlesWon + 1,
      };

    case 'ADD_CARD':
      return { ...state, deck: [...state.deck, action.card] };

    case 'ADD_RELIC': {
      if (state.relics.some(r => r.relicId === action.relicId)) return state;
      return {
        ...state,
        relics: [...state.relics, { relicId: action.relicId, counter: 0 }],
      };
    }

    case 'UPGRADE_PIECE':
      return {
        ...state,
        playerPieces: state.playerPieces.map(p =>
          p.id === action.pieceId
            ? { ...p, upgrades: [...p.upgrades, action.upgrade] }
            : p,
        ),
      };

    case 'SPEND_GOLD':
      return { ...state, gold: Math.max(0, state.gold - action.amount) };

    case 'HEAL':
      return {
        ...state,
        playerHp: Math.min(state.playerHp + action.amount, state.maxPlayerHp),
      };

    case 'END_RUN':
      return null;
  }
}
