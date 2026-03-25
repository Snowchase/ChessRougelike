/**
 * relics.ts — Relic definitions (pure functions that transform BattleState)
 *
 *  1. Blood Rogue         — onCapture:    gain +1 HP
 *  2. Zwischenzug         — onCapture:    every 3rd capture bursts the combo
 *  3. Fork                — onLand:       if 2+ threats, draw a card
 *  4. Envenomed Ranger    — onCapture:    Ranger poisons enemies on diagonals
 *  5. Sharpened Blade     — onTurnStart:  every 2nd turn, draw 1 card
 *  6. Iron Will           — onTurnStart:  if HP ≤ half max, gain +1 HP
 *  7. Battle Hardened     — onTurnEnd:    gain +1 HP each turn (up to max)
 *  8. Tactical Retreat    — onTurnEnd:    every 3rd turn end, draw 1 card
 *  9. Death Toll          — onPieceDeath: when an enemy dies, gain +1 gold
 * 10. Martyr's Resolve    — onPieceDeath: when a friendly dies, draw 2 cards
 * 11. Survivor's Blessing — onBattleWin:  heal +5 HP after each victory
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

  // ── 5. Sharpened Blade ─────────────────────────────────────────────────────
  {
    id: 'sharpened_blade',
    name: 'Sharpened Blade',
    description: 'Every 2nd turn, draw an extra card.',
    trigger: 'onTurnStart',
    rarity: 'common',
    apply(state, _event, relic) {
      relic.counter += 1;
      if (relic.counter % 2 !== 0) return {};
      const { drawn, newDeck, newDiscard } = drawCards(state.playerDeck, state.playerDiscard, 1);
      if (drawn.length === 0) return {};
      return {
        playerHand: [...state.playerHand, ...drawn],
        playerDeck: newDeck,
        playerDiscard: newDiscard,
        log: [...state.log, `Sharpened Blade: drew ${drawn[0].name}`],
      };
    },
  },

  // ── 6. Iron Will ───────────────────────────────────────────────────────────
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Each turn: if HP ≤ half max, gain +1 HP.',
    trigger: 'onTurnStart',
    rarity: 'uncommon',
    apply(state, _event, _relic) {
      if (state.playerHp > Math.floor(state.maxPlayerHp / 2)) return {};
      const newHp = Math.min(state.playerHp + 1, state.maxPlayerHp);
      return {
        playerHp: newHp,
        log: [...state.log, `Iron Will: low HP — gained 1 HP (${newHp}/${state.maxPlayerHp})`],
      };
    },
  },

  // ── 7. Battle Hardened ─────────────────────────────────────────────────────
  {
    id: 'battle_hardened',
    name: 'Battle Hardened',
    description: 'After each enemy turn, gain +1 HP.',
    trigger: 'onTurnEnd',
    rarity: 'common',
    apply(state, _event, _relic) {
      const newHp = Math.min(state.playerHp + 1, state.maxPlayerHp);
      if (newHp === state.playerHp) return {};
      return {
        playerHp: newHp,
        log: [...state.log, `Battle Hardened: +1 HP (${newHp}/${state.maxPlayerHp})`],
      };
    },
  },

  // ── 8. Tactical Retreat ────────────────────────────────────────────────────
  {
    id: 'tactical_retreat',
    name: 'Tactical Retreat',
    description: 'Every 3rd turn end, draw an extra card.',
    trigger: 'onTurnEnd',
    rarity: 'uncommon',
    apply(state, _event, relic) {
      relic.counter += 1;
      if (relic.counter % 3 !== 0) return {};
      const { drawn, newDeck, newDiscard } = drawCards(state.playerDeck, state.playerDiscard, 1);
      if (drawn.length === 0) return {};
      return {
        playerHand: [...state.playerHand, ...drawn],
        playerDeck: newDeck,
        playerDiscard: newDiscard,
        log: [...state.log, `Tactical Retreat: drew ${drawn[0].name}`],
      };
    },
  },

  // ── 9. Death Toll ──────────────────────────────────────────────────────────
  {
    id: 'death_toll',
    name: 'Death Toll',
    description: 'Each enemy that falls grants +1 bonus gold.',
    trigger: 'onPieceDeath',
    rarity: 'common',
    apply(state, event, _relic) {
      if (event.team !== 'enemy') return {};
      return {
        gold: state.gold + 1,
        log: [...state.log, `Death Toll: +1 gold (${state.gold + 1} total)`],
      };
    },
  },

  // ── 10. Martyr's Resolve ───────────────────────────────────────────────────
  {
    id: 'martyrs_resolve',
    name: "Martyr's Resolve",
    description: 'When one of your pieces falls, draw 2 cards.',
    trigger: 'onPieceDeath',
    rarity: 'rare',
    apply(state, event, _relic) {
      if (event.team !== 'player') return {};
      const { drawn, newDeck, newDiscard } = drawCards(state.playerDeck, state.playerDiscard, 2);
      if (drawn.length === 0) return {};
      return {
        playerHand: [...state.playerHand, ...drawn],
        playerDeck: newDeck,
        playerDiscard: newDiscard,
        log: [...state.log, `Martyr's Resolve: drew ${drawn.map(c => c.name).join(', ')}`],
      };
    },
  },

  // ── 11. Survivor's Blessing ────────────────────────────────────────────────
  {
    id: 'survivors_blessing',
    name: "Survivor's Blessing",
    description: 'After each victory, heal +5 HP.',
    trigger: 'onBattleWin',
    rarity: 'common',
    apply(state, _event, _relic) {
      const newHp = Math.min(state.playerHp + 5, state.maxPlayerHp);
      const gained = newHp - state.playerHp;
      if (gained <= 0) return {};
      return {
        playerHp: newHp,
        log: [...state.log, `Survivor's Blessing: victory healed ${gained} HP (${newHp}/${state.maxPlayerHp})`],
      };
    },
  },
];
