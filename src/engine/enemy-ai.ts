/**
 * enemy-ai.ts — Scripted enemy behavior
 *
 * Enemies follow repeating scripts that are telegraphed to the player
 * one turn in advance (Slay the Spire-style intents).
 *
 * The AI picks moves based on its current script step:
 *   ADVANCE  — move a piece toward the player's Hero
 *   THREATEN — position a piece to fork the player
 *   ATTACK   — capture a player piece if possible; else advance
 */

import { BattleState, EnemyScript, Piece, Position } from './types';
import { getLegalMoves, pieceAt } from './moves';

// ─── Script Definitions ───────────────────────────────────────────────────────

export const GUARD_SCRIPT: EnemyScript = {
  name: 'Guard',
  steps: [
    { action: 'ADVANCE',  description: 'The enemy advances through the dungeon.' },
    { action: 'THREATEN', description: 'The enemy repositions for a flanking strike.' },
    { action: 'ATTACK',   description: 'The enemy prepares to strike!' },
  ],
};

export const RUSHER_SCRIPT: EnemyScript = {
  name: 'Rusher',
  steps: [
    { action: 'ADVANCE', description: 'The enemy charges forward!' },
    { action: 'ATTACK',  description: 'The enemy attacks!' },
  ],
};

// ─── AI Move Selection ────────────────────────────────────────────────────────

interface AIMove {
  piece: Piece;
  to: Position;
  isCapture: boolean;
}

function playerHeroPos(state: BattleState): Position | null {
  const hero = state.pieces.find(p => p.type === 'HERO' && p.team === 'player');
  return hero?.position ?? null;
}

/** Manhattan distance between two positions */
function dist(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Find all legal moves for all enemy pieces. */
function allEnemyMoves(state: BattleState): AIMove[] {
  const moves: AIMove[] = [];
  for (const piece of state.pieces.filter(p => p.team === 'enemy')) {
    const legal = getLegalMoves(piece, state.pieces, state.board);
    for (const to of legal) {
      const target = pieceAt(state.pieces, to.row, to.col);
      moves.push({
        piece,
        to,
        isCapture: target !== undefined && target.team === 'player',
      });
    }
  }
  return moves;
}

/** ATTACK: pick the move that captures the highest-value player piece. */
function attackMove(state: BattleState): AIMove | null {
  const PIECE_VALUE: Record<string, number> = {
    ROGUE: 1, BRAWLER: 3, RANGER: 3, GUARDIAN: 5, WITCH: 9, HERO: 100,
  };
  const captures = allEnemyMoves(state).filter(m => m.isCapture);
  if (captures.length === 0) return null;

  captures.sort((a, b) => {
    const pieceA = pieceAt(state.pieces, a.to.row, a.to.col);
    const pieceB = pieceAt(state.pieces, b.to.row, b.to.col);
    const valA = pieceA ? (PIECE_VALUE[pieceA.type] ?? 0) : 0;
    const valB = pieceB ? (PIECE_VALUE[pieceB.type] ?? 0) : 0;
    return valB - valA; // highest value first
  });
  return captures[0];
}

/** ADVANCE: move the piece closest to player Hero further toward it. */
function advanceMove(state: BattleState): AIMove | null {
  const heroPos = playerHeroPos(state);
  if (!heroPos) return null;

  const all = allEnemyMoves(state);
  if (all.length === 0) return null;

  // Sort by which move closes the most distance to player Hero
  all.sort((a, b) => {
    const dA = dist(a.to, heroPos);
    const dB = dist(b.to, heroPos);
    return dA - dB;
  });
  return all[0];
}

/** THREATEN: try to find a move that attacks 2+ player pieces (fork). Else advance. */
function threatenMove(state: BattleState): AIMove | null {
  const all = allEnemyMoves(state);
  let best: AIMove | null = null;
  let bestThreats = 0;

  for (const move of all) {
    // Simulate move
    const simPieces = state.pieces.map(p =>
      p.id === move.piece.id ? { ...p, position: move.to, hasMoved: true } : p,
    ).filter(p => !(p.team === 'player' && p.position.row === move.to.row && p.position.col === move.to.col));

    const simPiece = simPieces.find(p => p.id === move.piece.id);
    if (!simPiece) continue;

    const threats = getLegalMoves(simPiece, simPieces, state.board).filter(sq => {
      const target = pieceAt(simPieces, sq.row, sq.col);
      return target && target.team === 'player';
    }).length;

    if (threats > bestThreats) {
      bestThreats = threats;
      best = move;
    }
  }

  if (best && bestThreats >= 2) return best;
  return advanceMove(state); // fall back to advancing
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EnemyTurnResult {
  movedPieceId: string;
  from: Position;
  to: Position;
  capturedPieceId: string | null;
  description: string;
}

/**
 * Compute the enemy's move for this turn based on the script step.
 * Returns null if no moves available (enemy has no pieces).
 */
export function computeEnemyMove(
  state: BattleState,
  script: EnemyScript,
): EnemyTurnResult | null {
  const step = script.steps[state.enemyScriptStep % script.steps.length];
  let move: AIMove | null = null;

  switch (step.action) {
    case 'ATTACK':
      move = attackMove(state) ?? advanceMove(state);
      break;
    case 'THREATEN':
      move = threatenMove(state);
      break;
    case 'ADVANCE':
    default:
      move = advanceMove(state);
      break;
  }

  if (!move) return null;

  const captured = pieceAt(state.pieces, move.to.row, move.to.col);
  return {
    movedPieceId: move.piece.id,
    from: move.piece.position,
    to: move.to,
    capturedPieceId: captured?.id ?? null,
    description: step.description,
  };
}

/**
 * Get the telegraphed intent for the NEXT turn (so the player can plan).
 */
export function getNextIntent(state: BattleState, script: EnemyScript): string {
  const nextStep = script.steps[(state.enemyScriptStep + 1) % script.steps.length];
  return nextStep.description;
}
