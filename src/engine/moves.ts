/**
 * moves.ts — Pure legal move calculator
 *
 * Board orientation:
 *   Row 0 = top (enemy starting side)
 *   Row 7 = bottom (player starting side)
 *   Player pieces move UP (decreasing row)
 *   Enemy pieces move DOWN (increasing row)
 *
 * Environment tiles:
 *   WALL / BREAKABLE_WALL — block movement AND line-of-sight for sliders
 *   WATER / LAVA          — passable; transparent to line-of-sight
 *   FLOOR                 — no restriction
 */

import { Piece, PieceType, Position, Team, Tile } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inBounds(row: number, col: number, rows: number = 8, cols: number = 8): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

export function pieceAt(pieces: Piece[], row: number, col: number): Piece | undefined {
  return pieces.find(p => p.position.row === row && p.position.col === col);
}

function occupiedBy(pieces: Piece[], row: number, col: number, team: Team): boolean {
  const p = pieceAt(pieces, row, col);
  return p !== undefined && p.team === team;
}

/** Returns true if the tile at (row, col) is impassable (wall). */
function isWall(board: Tile[][], row: number, col: number): boolean {
  const tile = board[row]?.[col];
  if (!tile) return false;
  return tile.type === 'WALL' || tile.type === 'BREAKABLE_WALL';
}

/** Slide in one direction until the board edge, a wall tile, a friendly piece, or an enemy piece. */
function slide(
  pieces: Piece[],
  board: Tile[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  team: Team,
): Position[] {
  const bRows = board.length;
  const bCols = board[0]?.length ?? 8;
  const moves: Position[] = [];
  const opp: Team = team === 'player' ? 'enemy' : 'player';
  let nr = row + dr;
  let nc = col + dc;
  while (inBounds(nr, nc, bRows, bCols)) {
    if (isWall(board, nr, nc)) break;              // wall blocks entry and sight
    if (occupiedBy(pieces, nr, nc, team)) break;   // blocked by friendly
    moves.push({ row: nr, col: nc });
    if (occupiedBy(pieces, nr, nc, opp)) break;    // stop after capture square
    nr += dr;
    nc += dc;
  }
  return moves;
}

// ─── Per-piece move generators ────────────────────────────────────────────────

function rogueMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  const bRows = board.length;
  const bCols = board[0]?.length ?? 8;
  const moves: Position[] = [];
  const { team, upgrades, position: { row, col } } = piece;
  const dir = team === 'player' ? -1 : 1;
  const startRow = team === 'player' ? bRows - 2 : 1;
  const opp: Team = team === 'player' ? 'enemy' : 'player';

  // Forward 1
  const fwd1 = row + dir;
  if (inBounds(fwd1, col, bRows, bCols) && !isWall(board, fwd1, col) && !pieceAt(pieces, fwd1, col)) {
    moves.push({ row: fwd1, col });
    // Forward 2 from starting row
    const fwd2 = row + 2 * dir;
    if (row === startRow && inBounds(fwd2, col, bRows, bCols) && !isWall(board, fwd2, col) && !pieceAt(pieces, fwd2, col)) {
      moves.push({ row: fwd2, col });
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const nr = row + dir;
    const nc = col + dc;
    if (!inBounds(nr, nc, bRows, bCols) || isWall(board, nr, nc)) continue;

    if (occupiedBy(pieces, nr, nc, opp)) {
      moves.push({ row: nr, col: nc });
    } else if (upgrades.includes('VETERAN') && !pieceAt(pieces, nr, nc)) {
      // VETERAN ROGUE: can also move diagonally to empty squares
      moves.push({ row: nr, col: nc });
    }
  }

  return moves;
}

function brawlerMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  const bRows = board.length;
  const bCols = board[0]?.length ?? 8;
  const moves: Position[] = [];
  const { team, upgrades, position: { row, col } } = piece;
  // Brawler leaps — walls don't block jumpers
  const BASE_OFFSETS: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  // NIGHTMARE: adds extended L-jumps (±3,±1) and (±1,±3) for greater reach
  const NIGHTMARE_OFFSETS: [number, number][] = [[-3, -1], [-3, 1], [-1, -3], [-1, 3], [1, -3], [1, 3], [3, -1], [3, 1]];
  const offsets = upgrades.includes('NIGHTMARE')
    ? [...BASE_OFFSETS, ...NIGHTMARE_OFFSETS]
    : BASE_OFFSETS;

  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc, bRows, bCols) && !occupiedBy(pieces, nr, nc, team)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function rangerMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  const { team, upgrades, position: { row, col } } = piece;
  const diagonals = [
    ...slide(pieces, board, row, col, -1, -1, team),
    ...slide(pieces, board, row, col, -1,  1, team),
    ...slide(pieces, board, row, col,  1, -1, team),
    ...slide(pieces, board, row, col,  1,  1, team),
  ];
  if (!upgrades.includes('DARK_RANGER')) return diagonals;
  // DARK_RANGER: also slides orthogonally (effectively bishop → queen)
  return [
    ...diagonals,
    ...slide(pieces, board, row, col, -1, 0, team),
    ...slide(pieces, board, row, col,  1, 0, team),
    ...slide(pieces, board, row, col,  0, -1, team),
    ...slide(pieces, board, row, col,  0,  1, team),
  ];
}

function guardianMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  const { team, position: { row, col } } = piece;
  return [
    ...slide(pieces, board, row, col, -1, 0, team),
    ...slide(pieces, board, row, col,  1, 0, team),
    ...slide(pieces, board, row, col,  0, -1, team),
    ...slide(pieces, board, row, col,  0,  1, team),
  ];
}

function witchMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  return [...rangerMoves(piece, pieces, board), ...guardianMoves(piece, pieces, board)];
}

function heroMoves(piece: Piece, pieces: Piece[], board: Tile[][]): Position[] {
  const bRows = board.length;
  const bCols = board[0]?.length ?? 8;
  const moves: Position[] = [];
  const { team, position: { row, col } } = piece;
  const OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (const [dr, dc] of OFFSETS) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc, bRows, bCols) && !isWall(board, nr, nc) && !occupiedBy(pieces, nr, nc, team)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Empty 8×8 FLOOR board — used as default when no layout is specified. */
function emptyBoard(): Tile[][] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => ({ type: 'FLOOR' as const })),
  );
}

export function getLegalMoves(piece: Piece, pieces: Piece[], board?: Tile[][]): Position[] {
  const b = board ?? emptyBoard();
  switch (piece.type) {
    case 'ROGUE':    return rogueMoves(piece, pieces, b);
    case 'BRAWLER':  return brawlerMoves(piece, pieces, b);
    case 'RANGER':   return rangerMoves(piece, pieces, b);
    case 'GUARDIAN': return guardianMoves(piece, pieces, b);
    case 'WITCH':    return witchMoves(piece, pieces, b);
    case 'HERO':     return heroMoves(piece, pieces, b);
  }
}

/** Separate capture squares from quiet moves for highlighting. */
export function classifyMoves(
  piece: Piece,
  pieces: Piece[],
  board?: Tile[][],
): { moves: Position[]; captures: Position[] } {
  const opp: Team = piece.team === 'player' ? 'enemy' : 'player';
  const all = getLegalMoves(piece, pieces, board);
  const moves: Position[] = [];
  const captures: Position[] = [];
  for (const sq of all) {
    if (occupiedBy(pieces, sq.row, sq.col, opp)) {
      captures.push(sq);
    } else {
      moves.push(sq);
    }
  }
  return { moves, captures };
}

/** Count how many enemy pieces a piece threatens (for Fork relic). */
export function countThreats(piece: Piece, pieces: Piece[], board?: Tile[][]): number {
  const opp: Team = piece.team === 'player' ? 'enemy' : 'player';
  return getLegalMoves(piece, pieces, board).filter(sq =>
    occupiedBy(pieces, sq.row, sq.col, opp),
  ).length;
}

/** Get all diagonal positions from a square (for Envenomed Ranger relic). */
export function getDiagonalPositions(from: Position): Position[] {
  const positions: Position[] = [];
  const DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of DIRS) {
    let r = from.row + dr;
    let c = from.col + dc;
    while (inBounds(r, c)) {
      positions.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }
  return positions;
}
