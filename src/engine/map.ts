/**
 * map.ts — Map Generator
 *
 * Generates a Slay the Spire-style branching path map.
 * The map has TOTAL_ROWS rows, each with 2–4 nodes.
 * Row 0 = first floor (start), Row TOTAL_ROWS-1 = boss floor.
 *
 * Node type distribution by row:
 *   Rows 0–2:  mostly fights, some rest/shop
 *   Rows 3–6:  fights + elites, shops, events
 *   Rows 7–9:  elites, events, shops
 *   Row 10:    boss (always)
 */

export type NodeType = 'fight' | 'elite' | 'shop' | 'rest' | 'event' | 'boss';

export interface MapNode {
  id: string;
  row: number;
  col: number;
  type: NodeType;
  encounterId: string | null;  // which encounter formation to use
  nextNodeIds: string[];       // ids of nodes in the next row this connects to
  visited: boolean;
  reachable: boolean;          // can the player tap this node right now?
}

const TOTAL_ROWS = 11; // rows 0–9 = normal floors, row 10 = boss
const MAX_COLS = 4;

// ─── Type Picker ──────────────────────────────────────────────────────────────

type WeightedEntry = { type: NodeType; weight: number };

function pickWeighted(weights: WeightedEntry[]): NodeType {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const { type, weight } of weights) {
    r -= weight;
    if (r <= 0) return type;
  }
  return weights[weights.length - 1].type;
}

function nodeTypeForRow(row: number): NodeType {
  if (row === TOTAL_ROWS - 1) return 'boss';
  if (row <= 2) {
    return pickWeighted([
      { type: 'fight', weight: 6 },
      { type: 'rest',  weight: 2 },
      { type: 'shop',  weight: 2 },
    ]);
  }
  if (row <= 6) {
    return pickWeighted([
      { type: 'fight', weight: 4 },
      { type: 'elite', weight: 2 },
      { type: 'shop',  weight: 2 },
      { type: 'rest',  weight: 1 },
      { type: 'event', weight: 1 },
    ]);
  }
  return pickWeighted([
    { type: 'fight', weight: 2 },
    { type: 'elite', weight: 3 },
    { type: 'shop',  weight: 2 },
    { type: 'event', weight: 3 },
  ]);
}

function encounterId(type: NodeType, row: number): string | null {
  if (type === 'boss') return 'act1_boss';
  if (type === 'elite') return row <= 5 ? 'elite_heavy_guard' : 'elite_berserker';
  if (type === 'fight') {
    const idx = (row % 3) + 1;
    return `normal_fight_${idx}`;
  }
  return null;
}

// ─── Map Generator ────────────────────────────────────────────────────────────

export function generateMap(_act: number): MapNode[][] {
  const rows: MapNode[][] = [];

  // Build all nodes
  for (let row = 0; row < TOTAL_ROWS; row++) {
    if (row === TOTAL_ROWS - 1) {
      // Boss row: always a single centered node
      rows.push([{
        id: `r${row}c0`,
        row,
        col: 0,
        type: 'boss',
        encounterId: 'act1_boss',
        nextNodeIds: [],
        visited: false,
        reachable: false,
      }]);
      continue;
    }

    // Generate 2–4 nodes per row
    const colCount = row === 0
      ? 2 + Math.floor(Math.random() * 2)  // 2–3 for first row
      : 2 + Math.floor(Math.random() * 3); // 2–4 for others

    const rowNodes: MapNode[] = [];
    for (let col = 0; col < Math.min(colCount, MAX_COLS); col++) {
      const type = nodeTypeForRow(row);
      rowNodes.push({
        id: `r${row}c${col}`,
        row,
        col,
        type,
        encounterId: encounterId(type, row),
        nextNodeIds: [],
        visited: false,
        reachable: row === 0, // first row starts reachable
      });
    }
    rows.push(rowNodes);
  }

  // Wire connections: each node connects to 1–2 nodes in the next row
  for (let row = 0; row < TOTAL_ROWS - 1; row++) {
    const current = rows[row];
    const next = rows[row + 1];

    for (const node of current) {
      // Map this node's column proportionally to the next row's column range
      const ratio = current.length <= 1 ? 0.5 : node.col / (current.length - 1);
      const ideal = Math.round(ratio * (next.length - 1));

      const candidates = [
        Math.max(0, Math.min(next.length - 1, ideal)),
        Math.max(0, Math.min(next.length - 1, ideal + (Math.random() < 0.4 ? 1 : -1))),
      ].filter((v, i, arr) => arr.indexOf(v) === i);

      for (const nextCol of candidates) {
        const nextId = next[nextCol].id;
        if (!node.nextNodeIds.includes(nextId)) {
          node.nextNodeIds.push(nextId);
        }
      }
    }
  }

  return rows;
}

// ─── Map Utilities ────────────────────────────────────────────────────────────

export function getNode(map: MapNode[][], row: number, col: number): MapNode | undefined {
  return map[row]?.[col];
}

/** After visiting a node, mark its successors as reachable. */
export function markSuccessorsReachable(map: MapNode[][], row: number, col: number): MapNode[][] {
  const node = getNode(map, row, col);
  if (!node) return map;

  return map.map(mapRow =>
    mapRow.map(n => {
      if (node.nextNodeIds.includes(n.id)) {
        return { ...n, reachable: true };
      }
      return n;
    }),
  );
}

/** Emoji icon for each node type. */
export const NODE_ICONS: Record<NodeType, string> = {
  fight: '⚔️',
  elite: '💀',
  shop:  '🛒',
  rest:  '🔥',
  event: '❓',
  boss:  '👑',
};

/** Display label for each node type. */
export const NODE_LABELS: Record<NodeType, string> = {
  fight: 'Fight',
  elite: 'Elite',
  shop:  'Shop',
  rest:  'Rest',
  event: 'Event',
  boss:  'BOSS',
};
