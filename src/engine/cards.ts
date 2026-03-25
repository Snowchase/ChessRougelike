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
    description: 'Step forward 1–2.',
    tags: ['FORWARD'],
  },
  {
    id: 'shadow_strike',
    pieceType: 'ROGUE',
    name: 'Shadow Strike',
    baseDamage: 2,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'Step fwd, then hit diag.',
    tags: ['FORWARD', 'CHAIN'],
  },

  // ── Brawler Cards ──
  {
    id: 'charge',
    pieceType: 'BRAWLER',
    name: "Brawler's Charge",
    baseDamage: 2,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'L-leap; hit on land.',
    tags: ['LEAP'],
  },
  {
    id: 'bull_rush',
    pieceType: 'BRAWLER',
    name: 'Bull Rush',
    baseDamage: 3,
    effect: 'CHAIN',
    rarity: 'uncommon',
    description: 'L-leap; chain hit after.',
    tags: ['LEAP', 'CHAIN'],
  },

  // ── Ranger Cards ──
  {
    id: 'covering_fire',
    pieceType: 'RANGER',
    name: 'Covering Fire',
    baseDamage: 1,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'common',
    description: 'Diag sweep; hit all.',
    tags: ['DIAGONAL', 'SWEEP'],
  },
  {
    id: 'poison_arrow',
    pieceType: 'RANGER',
    name: 'Poison Arrow',
    baseDamage: 2,
    effect: 'DIAGONAL_SWEEP',
    rarity: 'uncommon',
    description: 'Diag; poison foes hit.',
    tags: ['DIAGONAL', 'SWEEP'],
  },

  // ── Guardian Cards ──
  {
    id: 'shield_wall',
    pieceType: 'GUARDIAN',
    name: 'Shield Wall',
    baseDamage: 2,
    effect: 'CASTLE',
    rarity: 'common',
    description: 'March + swap an ally.',
    tags: ['MARCH'],
  },
  {
    id: 'battering_ram',
    pieceType: 'GUARDIAN',
    name: 'Battering Ram',
    baseDamage: 3,
    effect: 'CASTLE',
    rarity: 'uncommon',
    description: 'Thrust; keep your turn.',
    tags: ['MARCH'],
  },

  // ── Witch Cards ──
  {
    id: 'arcane_surge',
    pieceType: 'WITCH',
    name: 'Arcane Surge',
    baseDamage: 4,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Any direction. −2 HP.',
    hpCost: 2,
    tags: ['SACRIFICE'],
  },
  {
    id: 'blood_ritual',
    pieceType: 'WITCH',
    name: 'Blood Ritual',
    baseDamage: 6,
    effect: 'GAMBIT',
    rarity: 'rare',
    description: 'Massive hit. −5 HP.',
    hpCost: 5,
    tags: ['SACRIFICE'],
  },

  // ── Hero Cards ──
  {
    id: 'hero_step',
    pieceType: 'HERO',
    name: "Hero's Stand",
    baseDamage: 1,
    effect: 'NORMAL',
    rarity: 'common',
    description: 'One step, any dir.',
    tags: ['FORWARD'],
  },

  // ── Ability Cards ──────────────────────────────────────────────────────────
  // These cards manipulate piece positions rather than making captures.

  {
    id: 'shove',
    pieceType: 'BRAWLER',
    name: 'Shove',
    baseDamage: 0,
    effect: 'PUSH',
    rarity: 'uncommon',
    description: 'Push an adjacent enemy 2 squares away.',
    abilityPower: 2,
    tags: ['LEAP', 'ABILITY', 'DISPLACEMENT'],
  },
  {
    id: 'stand_fast',
    pieceType: 'GUARDIAN',
    name: 'Stand Fast',
    baseDamage: 0,
    effect: 'PUSH',
    rarity: 'uncommon',
    description: 'Slam an adjacent enemy 3 squares away.',
    abilityPower: 3,
    tags: ['MARCH', 'ABILITY', 'DISPLACEMENT'],
  },
  {
    id: 'smoke_step',
    pieceType: 'ROGUE',
    name: 'Smoke Step',
    baseDamage: 0,
    effect: 'TELEPORT',
    rarity: 'common',
    description: 'Vanish and reappear within 3 tiles.',
    abilityPower: 3,
    tags: ['FORWARD', 'ABILITY'],
  },
  {
    id: 'switcheroo',
    pieceType: 'ROGUE',
    name: 'Switcheroo',
    baseDamage: 0,
    effect: 'SWAP_ALLY',
    rarity: 'rare',
    description: 'Swap positions with any ally.',
    tags: ['ABILITY'],
  },
  {
    id: 'lasso',
    pieceType: 'RANGER',
    name: 'Lasso',
    baseDamage: 0,
    effect: 'PULL',
    rarity: 'uncommon',
    description: 'Yank any enemy in sight 2 steps closer.',
    abilityPower: 2,
    tags: ['DIAGONAL', 'ABILITY', 'DISPLACEMENT'],
  },
  {
    id: 'arcane_burst',
    pieceType: 'WITCH',
    name: 'Arcane Burst',
    baseDamage: 0,
    effect: 'REPULSE',
    rarity: 'uncommon',
    description: 'Push ALL adjacent enemies 2 sq. -2 HP.',
    hpCost: 2,
    abilityPower: 2,
    tags: ['SACRIFICE', 'ABILITY', 'DISPLACEMENT'],
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
