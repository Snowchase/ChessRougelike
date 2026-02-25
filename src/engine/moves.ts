/**
 * moves.ts — Pure legal move calculator
 *
 * Board orientation:
 *   Row 0 = top (enemy starting side)
 *   Row 7 = bottom (player starting side)
 *   Player pieces move UP (decreasing row)
 *   Enemy pieces move DOWN (increasing row)
 */

import { Piece, PieceType, Position, Team } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function pieceAt(pieces: Piece[], row: number, col: number): Piece | undefined {
  return pieces.find(p => p.position.row === row && p.position.col === col);
}

function occupiedBy(pieces: Piece[], row: number, col: number, team: Team): boolean {
  const p = pieceAt(pieces, row, col);
  return p !== undefined && p.team === team;
}

/** Slide in one direction until the board edge, a friendly piece, or an enemy piece. */
function slide(
  pieces: Piece[],
  row: number,
  col: number,
  dr: number,
  dc: number,
  team: Team,
): Position[] {
  const moves: Position[] = [];
  const opp: Team = team === 'player' ? 'enemy' : 'player';
  let nr = row + dr;
  let nc = col + dc;
  while (inBounds(nr, nc)) {
    if (occupiedBy(pieces, nr, nc, team)) break;       // blocked by friendly
    moves.push({ row: nr, col: nc });
    if (occupiedBy(pieces, nr, nc, opp)) break;        // stop after capture square
    nr += dr;
    nc += dc;
  }
  return moves;
}

// ─── Per-piece move generators ────────────────────────────────────────────────

function pawnMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { team, upgrades, position: { row, col } } = piece;
  const dir = team === 'player' ? -1 : 1;
  const startRow = team === 'player' ? 6 : 1;
  const opp: Team = team === 'player' ? 'enemy' : 'player';

  // Forward 1
  const fwd1 = row + dir;
  if (inBounds(fwd1, col) && !pieceAt(pieces, fwd1, col)) {
    moves.push({ row: fwd1, col });
    // Forward 2 from starting row (must not be blocked at fwd1)
    const fwd2 = row + 2 * dir;
    if (row === startRow && inBounds(fwd2, col) && !pieceAt(pieces, fwd2, col)) {
      moves.push({ row: fwd2, col });
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const nr = row + dir;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;

    if (occupiedBy(pieces, nr, nc, opp)) {
      moves.push({ row: nr, col: nc });
    } else if (upgrades.includes('PROMOTED') && !pieceAt(pieces, nr, nc)) {
      // PROMOTED PAWN: can also move diagonally to empty squares
      moves.push({ row: nr, col: nc });
    }
  }

  return moves;
}

function knightMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { team, position: { row, col } } = piece;
  const OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  for (const [dr, dc] of OFFSETS) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && !occupiedBy(pieces, nr, nc, team)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

function bishopMoves(piece: Piece, pieces: Piece[]): Position[] {
  const { team, position: { row, col } } = piece;
  return [
    ...slide(pieces, row, col, -1, -1, team),
    ...slide(pieces, row, col, -1,  1, team),
    ...slide(pieces, row, col,  1, -1, team),
    ...slide(pieces, row, col,  1,  1, team),
  ];
}

function rookMoves(piece: Piece, pieces: Piece[]): Position[] {
  const { team, position: { row, col } } = piece;
  return [
    ...slide(pieces, row, col, -1, 0, team),
    ...slide(pieces, row, col,  1, 0, team),
    ...slide(pieces, row, col,  0, -1, team),
    ...slide(pieces, row, col,  0,  1, team),
  ];
}

function queenMoves(piece: Piece, pieces: Piece[]): Position[] {
  return [...bishopMoves(piece, pieces), ...rookMoves(piece, pieces)];
}

function kingMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { team, position: { row, col } } = piece;
  const OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (const [dr, dc] of OFFSETS) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && !occupiedBy(pieces, nr, nc, team)) {
      moves.push({ row: nr, col: nc });
    }
  }
  return moves;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLegalMoves(piece: Piece, pieces: Piece[]): Position[] {
  switch (piece.type) {
    case 'PAWN':   return pawnMoves(piece, pieces);
    case 'KNIGHT': return knightMoves(piece, pieces);
    case 'BISHOP': return bishopMoves(piece, pieces);
    case 'ROOK':   return rookMoves(piece, pieces);
    case 'QUEEN':  return queenMoves(piece, pieces);
    case 'KING':   return kingMoves(piece, pieces);
  }
}

/** Separate capture squares from quiet moves for highlighting. */
export function classifyMoves(
  piece: Piece,
  pieces: Piece[],
): { moves: Position[]; captures: Position[] } {
  const opp: Team = piece.team === 'player' ? 'enemy' : 'player';
  const all = getLegalMoves(piece, pieces);
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
export function countThreats(piece: Piece, pieces: Piece[]): number {
  const opp: Team = piece.team === 'player' ? 'enemy' : 'player';
  return getLegalMoves(piece, pieces).filter(sq =>
    occupiedBy(pieces, sq.row, sq.col, opp),
  ).length;
}

/** Get all diagonal positions from a square (for Poisoned Bishop). */
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
