/**
 * overworld.ts — Grid-based Overworld Engine
 *
 * The player navigates a 7×7 dungeon tile-by-tile.
 * Adjacent tiles are revealed as the player explores (fog of war).
 * Each tile may trigger a battle, shop, rest, or event.
 *
 * Tile flow:
 *   Move onto tile → see what's there → complete it → move on
 *   Corridor tiles are completed immediately on entry.
 *   Fight/Elite/Boss tiles are completed when returning from battle.
 *   Shop/Rest/Event tiles are completed via the map screen's modals/nav.
 */

export type TileType =
  | 'start'
  | 'corridor'
  | 'fight'
  | 'elite'
  | 'shop'
  | 'rest'
  | 'event'
  | 'boss';

export interface Tile {
  row: number;
  col: number;
  type: TileType;
  encounterId: string | null;
  visited: boolean;   // player has completed this tile's content
  revealed: boolean;  // fog-of-war: player can see this tile type
}

export type OverworldGrid = Tile[][];

export const GRID_SIZE = 7;

// ─── Visual ───────────────────────────────────────────────────────────────────

export const TILE_ICONS: Record<TileType, string> = {
  start:    '⬛',
  corridor: '·',
  fight:    '⚔️',
  elite:    '💀',
  shop:     '🛒',
  rest:     '🔥',
  event:    '❓',
  boss:     '👑',
};

export const TILE_BG: Record<TileType, string> = {
  start:    '#0d1a2e',
  corridor: '#1c1c2e',
  fight:    '#2a0e0e',
  elite:    '#1a082a',
  shop:     '#2a1e08',
  rest:     '#082a14',
  event:    '#081828',
  boss:     '#3a0000',
};

export const TILE_BORDER: Record<TileType, string> = {
  start:    '#1e3050',
  corridor: '#2a2a3e',
  fight:    '#6e1a1a',
  elite:    '#4a1a6a',
  shop:     '#6e4a10',
  rest:     '#1a6a2a',
  event:    '#1a3a5a',
  boss:     '#8a0000',
};

export const TILE_LABEL: Record<TileType, string> = {
  start:    'Start',
  corridor: '',
  fight:    'Fight',
  elite:    'Elite',
  shop:     'Shop',
  rest:     'Rest',
  event:    'Event',
  boss:     'BOSS',
};

// ─── Tile factory ─────────────────────────────────────────────────────────────

function makeTile(
  row: number,
  col: number,
  type: TileType = 'corridor',
  encounterId: string | null = null,
): Tile {
  return { row, col, type, encounterId, visited: false, revealed: false };
}

// ─── Adjacency ────────────────────────────────────────────────────────────────

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

export function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  return (Math.abs(r1 - r2) === 1 && c1 === c2) ||
         (Math.abs(c1 - c2) === 1 && r1 === r2);
}

export function adjacentPositions(row: number, col: number): [number, number][] {
  return DIRS
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);
}

// ─── Fog of war (pure — returns new grid) ─────────────────────────────────────

export function revealAround(grid: OverworldGrid, row: number, col: number): OverworldGrid {
  const newGrid = grid.map(r => r.map(t => ({ ...t })));
  newGrid[row][col].revealed = true;
  for (const [r, c] of adjacentPositions(row, col)) {
    newGrid[r][c].revealed = true;
  }
  return newGrid;
}

export function markVisited(grid: OverworldGrid, row: number, col: number): OverworldGrid {
  const newGrid = grid.map(r => r.map(t => ({ ...t })));
  newGrid[row][col].visited = true;
  return newGrid;
}

// ─── Grid generator ───────────────────────────────────────────────────────────

const ENCOUNTER_POOLS: Partial<Record<TileType, string[]>> = {
  fight: ['normal_fight_1', 'normal_fight_2', 'normal_fight_3'],
  elite: ['elite_heavy_guard', 'elite_berserker'],
};

function pickEncounter(type: TileType): string | null {
  const pool = ENCOUNTER_POOLS[type];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generate a 7×7 overworld grid.
 * - (0,0) = Start (top-left)
 * - (GRID_SIZE-1, GRID_SIZE-1) = Boss (bottom-right)
 * - Interior tiles: a mix of fight, elite, shop, rest, event, corridor
 * - A guaranteed path from start to boss exists (we don't wall anything off)
 * - Boss and start tiles are revealed from the beginning
 */
export function generateOverworld(): OverworldGrid {
  // Initialize all corridors
  const grid: OverworldGrid = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => makeTile(r, c)),
  );

  // Fixed positions
  grid[0][0].type = 'start';
  grid[0][0].visited = true;
  grid[GRID_SIZE - 1][GRID_SIZE - 1].type = 'boss';
  grid[GRID_SIZE - 1][GRID_SIZE - 1].encounterId = 'act1_boss';

  // Room placement plan: type → count
  const roomPlan: { type: TileType; count: number }[] = [
    { type: 'fight', count: 9 },
    { type: 'elite', count: 3 },
    { type: 'shop',  count: 2 },
    { type: 'rest',  count: 2 },
    { type: 'event', count: 2 },
  ];

  // Gather candidate positions (all except start and boss)
  const candidates: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if ((r === 0 && c === 0) || (r === GRID_SIZE - 1 && c === GRID_SIZE - 1)) continue;
      candidates.push([r, c]);
    }
  }

  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let idx = 0;
  for (const { type, count } of roomPlan) {
    for (let i = 0; i < count && idx < candidates.length; i++, idx++) {
      const [r, c] = candidates[idx];
      grid[r][c].type = type;
      grid[r][c].encounterId = pickEncounter(type);
    }
  }

  // Reveal start, its neighbors, and boss tile (so player knows destination)
  let result = revealAround(grid, 0, 0);
  result[GRID_SIZE - 1][GRID_SIZE - 1].revealed = true;

  return result;
}
