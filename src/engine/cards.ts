/**
 * cards.ts — Move Card definitions and deck utilities
 */

import { MoveCard, PieceType } from './types';

// ─── Card Pool ────────────────────────────────────────────────────────────────

export const ALL_CARDS: MoveCard[] = [
  // ── Pawn Cards ──
  {
    id: 'advance',
    pieceType: 'PAWN',
    name: 'Advance',
    baseDamage: 1,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'Move a Pawn forward 1–2 squares.',
  },
  {
    id: 'push',
    pieceType: 'PAWN',
    name: 'Aggressive Push',
    baseDamage: 2,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'Move a Pawn forward, then may capture diagonally.',
  },

  // ── Knight Cards ──
  {
    id: 'charge',
    pieceType: 'KNIGHT',
    name: 'Charge',
    baseDamage: 2,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'L-move; deal damage on landing.',
  },
  {
    id: 'midnight_ride',
    pieceType: 'KNIGHT',
    name: 'Midnight Ride',
    baseDamage: 3,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'L-move; hits next square after landing.',
  },

  // ── Bishop Cards ──
  {
    id: 'sweep',
    pieceType: 'BISHOP',
    name: 'Sweep',
    baseDamage: 1,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'common',
    description: 'Diagonal move; hits all pieces in path.',
  },
  {
    id: 'dark_prayer',
    pieceType: 'BISHOP',
    name: 'Dark Prayer',
    baseDamage: 2,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'uncommon',
    description: 'Diagonal move; poisons enemies in path.',
  },

  // ── Rook Cards ──
  {
    id: 'castle',
    pieceType: 'ROOK',
    name: 'Castle',
    baseDamage: 2,
    effect: 'CASTLE',
    rarity: 'common',
    description: 'Move + swap positions with an adjacent ally.',
  },
  {
    id: 'siege',
    pieceType: 'ROOK',
    name: 'Siege',
    baseDamage: 3,
    effect: 'CASTLE',
    rarity: 'uncommon',
    description: 'Powerful rook thrust; captures don\'t end your turn.',
  },

  // ── Queen Cards ──
  {
    id: 'gambit',
    pieceType: 'QUEEN',
    name: 'Gambit',
    baseDamage: 4,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Move any direction — costs 2 HP.',
    hpCost: 2,
  },
  {
    id: 'queen_sacrifice',
    pieceType: 'QUEEN',
    name: 'Royal Sacrifice',
    baseDamage: 6,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Massive damage — costs 5 HP.',
    hpCost: 5,
  },

  // ── King Cards ──
  {
    id: 'king_step',
    pieceType: 'KING',
    name: 'Tactical Step',
    baseDamage: 1,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'Move King one square in any direction.',
  },
];

// ─── Starting Deck Builder ────────────────────────────────────────────────────

/**
 * Build a starting player deck based on the pieces in the opening position.
 * Each piece type gets 2 copies of its common card.
 */
export function buildStartingDeck(pieceTypes: PieceType[]): MoveCard[] {
  const deck: MoveCard[] = [];
  const seen = new Set<string>();

  for (const type of pieceTypes) {
    const card = ALL_CARDS.find(c => c.pieceType === type && c.rarity === 'common');
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      deck.push({ ...card, id: `${card.id}_1` });
      deck.push({ ...card, id: `${card.id}_2` });
    }
  }
  return deck;
}

// ─── Deck Utilities ───────────────────────────────────────────────────────────

export function shuffleDeck(deck: MoveCard[]): MoveCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw `count` cards from the deck. Returns { drawn, remaining }.
 * If the deck runs dry, shuffles the discard pile back in.
 */
export function drawCards(
  deck: MoveCard[],
  discard: MoveCard[],
  count: number,
): { drawn: MoveCard[]; newDeck: MoveCard[]; newDiscard: MoveCard[] } {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  const drawn: MoveCard[] = [];

  while (drawn.length < count) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) break; // no more cards
      currentDeck = shuffleDeck(currentDiscard);
      currentDiscard = [];
    }
    drawn.push(currentDeck.shift()!);
  }

  return { drawn, newDeck: currentDeck, newDiscard: currentDiscard };
}
