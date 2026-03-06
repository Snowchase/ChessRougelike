/**
 * relics.ts — Relic definitions (pure functions that transform BattleState)
 *
 * Implemented for Phase 1:
 *   1. Blood Rogue         — On Capture: gain +1 HP
 *   2. Zwischenzug         — On Capture: every 3rd capture doubles the combo multiplier step
 *   3. Fork                — On Land:   if piece threatens 2+ enemies, draw an extra card
 *   4. Envenomed Ranger    — On Capture (by Ranger): enemies in diagonal path become poisoned
 */

import { RelicDefinition, BattleState, GameEvent, Piece } from './types';
import { countThreats, getDiagonalPositions, pieceAt } from './moves';
import { drawCards } from './cards';

export const RELIC_DEFINITIONS: RelicDefinition[] = [

  // ── 1. Blood Rogue ─────────────────────────────────────────────────────────
  {
    id: 'blood_rogue',
    name: 'Blood Rogue',
    description: 'On Capture: gain +1 HP (up to max).',
    trigger: 'onCapture',
    rarity: 'common',
    apply(state, _event, _relic) {
      const newHp = Math.min(state.playerHp + 1, state.maxPlayerHp);
      const gained = newHp - state.playerHp;
      if (gained <= 0) return {};
      return {
        playerHp: newHp,
        log: [...state.log, `Blood Rogue: gained ${gained} HP (${newHp}/${state.maxPlayerHp})`],
      };
    },
  },

  // ── 2. Zwischenzug ─────────────────────────────────────────────────────────
  {
    id: 'zwischenzug',
    name: 'Zwischenzug',
    description: 'Every 3rd consecutive capture doubles the combo multiplier.',
    trigger: 'onCapture',
    rarity: 'uncommon',
    apply(state, _event, relic) {
      relic.counter += 1;
      if (relic.counter % 3 === 0) {
        const bonus = Math.floor(state.consecutiveCaptures / 2) + 1;
        return {
          consecutiveCaptures: state.consecutiveCaptures + bonus,
          log: [...state.log, `Zwischenzug! Combo burst — ×${state.consecutiveCaptures + bonus} captures!`],
        };
      }
      return {};
    },
  },

  // ── 3. Fork ────────────────────────────────────────────────────────────────
  {
    id: 'fork',
    name: 'Fork',
    description: 'On Landing: if your piece threatens 2+ enemies, draw an extra card.',
    trigger: 'onLand',
    rarity: 'rare',
    apply(state, event, _relic) {
      const piece = state.pieces.find(p => p.id === event.pieceId);
      if (!piece || piece.team !== 'player') return {};

      const threats = countThreats(piece, state.pieces, state.board);
      if (threats < 2) return {};

      const { drawn, newDeck, newDiscard } = drawCards(state.playerDeck, state.playerDiscard, 1);
      if (drawn.length === 0) return {};

      return {
        playerHand: [...state.playerHand, ...drawn],
        playerDeck: newDeck,
        playerDiscard: newDiscard,
        log: [...state.log, `Fork! ${piece.type} threatens ${threats} enemies — drew ${drawn[0].name}`],
      };
    },
  },

  // ── 4. Envenomed Ranger ────────────────────────────────────────────────────
  {
    id: 'envenomed_ranger',
    name: 'Envenomed Ranger',
    description: 'On Ranger capture: poison all enemies on the same diagonals.',
    trigger: 'onCapture',
    rarity: 'uncommon',
    apply(state, event, _relic) {
      const piece = state.pieces.find(p => p.id === event.pieceId);
      if (!piece || piece.type !== 'RANGER' || piece.team !== 'player') return {};

      const capturePos = event.toPosition;
      if (!capturePos) return {};

      const diagonalSquares = getDiagonalPositions(capturePos);
      const updatedPieces: Piece[] = state.pieces.map(p => {
        if (p.team !== 'enemy') return p;
        const isOnDiagonal = diagonalSquares.some(
          sq => sq.row === p.position.row && sq.col === p.position.col,
        );
        if (!isOnDiagonal) return p;
        return { ...p, poisoned: true };
      });

      const poisonedCount = updatedPieces.filter(
        (p, i) => p.team === 'enemy' && p.poisoned && !state.pieces[i]?.poisoned,
      ).length;

      const logEntry = poisonedCount > 0
        ? `Envenomed Ranger: ${poisonedCount} enemy piece(s) poisoned!`
        : `Envenomed Ranger: no new enemies on diagonals.`;

      return {
        pieces: updatedPieces,
        log: [...state.log, logEntry],
      };
    },
  },
];
