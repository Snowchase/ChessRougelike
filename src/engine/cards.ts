/**
 * cards.ts — Move Card definitions and deck utilities
 */

import { MoveCard, PieceType } from './types';

// ─── Card Pool ────────────────────────────────────────────────────────────────

export const ALL_CARDS: MoveCard[] = [
  // ── Rogue Cards ──
  {
    id: 'skulk',
    pieceType: 'ROGUE',
    name: 'Skulk',
    baseDamage: 1,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'Move a Rogue forward 1–2 squares.',
  },
  {
    id: 'shadow_strike',
    pieceType: 'ROGUE',
    name: 'Shadow Strike',
    baseDamage: 2,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'Move a Rogue forward, then strike diagonally.',
  },

  // ── Brawler Cards ──
  {
    id: 'charge',
    pieceType: 'BRAWLER',
    name: "Brawler's Charge",
    baseDamage: 2,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'Leap through enemies; deal damage on landing.',
  },
  {
    id: 'bull_rush',
    pieceType: 'BRAWLER',
    name: 'Bull Rush',
    baseDamage: 3,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'Leap and smash — hits next square after landing.',
  },

  // ── Ranger Cards ──
  {
    id: 'covering_fire',
    pieceType: 'RANGER',
    name: 'Covering Fire',
    baseDamage: 1,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'common',
    description: 'Diagonal move; hits all targets in path.',
  },
  {
    id: 'poison_arrow',
    pieceType: 'RANGER',
    name: 'Poison Arrow',
    baseDamage: 2,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'uncommon',
    description: 'Diagonal move; poisons enemies in path.',
  },

  // ── Guardian Cards ──
  {
    id: 'shield_wall',
    pieceType: 'GUARDIAN',
    name: 'Shield Wall',
    baseDamage: 2,
    effect: 'CASTLE',
    rarity: 'common',
    description: 'March and swap positions with an adjacent ally.',
  },
  {
    id: 'battering_ram',
    pieceType: 'GUARDIAN',
    name: 'Battering Ram',
    baseDamage: 3,
    effect: 'CASTLE',
    rarity: 'uncommon',
    description: 'Powerful thrust; captures don\'t end your turn.',
  },

  // ── Witch Cards ──
  {
    id: 'arcane_surge',
    pieceType: 'WITCH',
    name: 'Arcane Surge',
    baseDamage: 4,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Move any direction — costs 2 HP.',
    hpCost: 2,
  },
  {
    id: 'blood_ritual',
    pieceType: 'WITCH',
    name: 'Blood Ritual',
    baseDamage: 6,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Devastating power — costs 5 HP.',
    hpCost: 5,
  },

  // ── Hero Cards ──
  {
    id: 'hero_step',
    pieceType: 'HERO',
    name: "Hero's Stand",
    baseDamage: 1,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'Move Hero one square in any direction.',
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
