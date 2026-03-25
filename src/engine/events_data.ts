/**
 * events_data.ts — Mystery Event pool
 *
 * Each EventDef has 3 choices. Effects map directly to RunAction dispatches
 * in the event screen. SPEND_GOLD_GAIN_* choices are disabled when the
 * player lacks sufficient gold.
 */

export type EventEffect =
  | { type: 'HEAL'; amount: number }
  | { type: 'ADD_CARD'; cardId: string }
  | { type: 'ADD_RELIC'; relicId: string }
  | { type: 'GAIN_GOLD'; amount: number }
  | { type: 'SPEND_GOLD_GAIN_RELIC'; cost: number; relicId: string }
  | { type: 'SPEND_GOLD_GAIN_CARD'; cost: number; cardId: string }
  | { type: 'NOTHING' };

export interface EventChoice {
  label: string;
  description: string;
  effect: EventEffect;
}

export interface EventDef {
  id: string;
  title: string;
  flavor: string;
  choices: EventChoice[];
}

export const EVENT_POOL: EventDef[] = [
  {
    id: 'abandoned_armory',
    title: 'Abandoned Armory',
    flavor: 'Rusted weapons and forgotten gear litter the floor of a deserted barracks. Something useful might remain.',
    choices: [
      {
        label: 'Scavenge for parts',
        description: 'Strip the metal down for coin. Gain 15 gold.',
        effect: { type: 'GAIN_GOLD', amount: 15 },
      },
      {
        label: 'Take a blade',
        description: 'A hidden scroll teaches the Shadow Strike technique. Add to deck.',
        effect: { type: 'ADD_CARD', cardId: 'shadow_strike' },
      },
      {
        label: 'Leave it',
        description: 'Nothing here worth the risk.',
        effect: { type: 'NOTHING' },
      },
    ],
  },

  {
    id: 'shrine_of_fortitude',
    title: 'Shrine of Fortitude',
    flavor: 'An ancient shrine glows with a faint warmth. The runes shift as you approach, promising renewal to the faithful.',
    choices: [
      {
        label: 'Pray',
        description: 'Kneel and receive the blessing. Restore 8 HP.',
        effect: { type: 'HEAL', amount: 8 },
      },
      {
        label: 'Make an offering (25 gold)',
        description: 'Trade coin for a permanent relic — Zwischenzug.',
        effect: { type: 'SPEND_GOLD_GAIN_RELIC', cost: 25, relicId: 'zwischenzug' },
      },
      {
        label: 'Walk past',
        description: 'Faith is for the weak.',
        effect: { type: 'NOTHING' },
      },
    ],
  },

  {
    id: 'ransacked_camp',
    title: 'Ransacked Camp',
    flavor: 'A fighting force passed through here recently. Their campsite has been picked over, but survivors left useful things behind.',
    choices: [
      {
        label: 'Search the tents',
        description: 'Unearth a Brawler\'s training scroll — Bull Rush.',
        effect: { type: 'ADD_CARD', cardId: 'bull_rush' },
      },
      {
        label: 'Raid the lockbox',
        description: 'Claim their emergency fund. Gain 20 gold.',
        effect: { type: 'GAIN_GOLD', amount: 20 },
      },
      {
        label: 'Set up camp',
        description: 'Rest here a while. Recover 6 HP.',
        effect: { type: 'HEAL', amount: 6 },
      },
    ],
  },

  {
    id: 'dark_mirror',
    title: 'The Dark Mirror',
    flavor: 'A mirror stands upright, framed in bone. Your reflection moves a half-second too slow — and it is smiling.',
    choices: [
      {
        label: 'Study the reflection',
        description: 'Gain arcane insight from the mirror\'s knowledge — Fork relic.',
        effect: { type: 'ADD_RELIC', relicId: 'fork' },
      },
      {
        label: 'Smash it',
        description: 'Sell the enchanted shards for coin. Gain 18 gold.',
        effect: { type: 'GAIN_GOLD', amount: 18 },
      },
      {
        label: 'Turn away',
        description: 'Some things should stay unknown.',
        effect: { type: 'NOTHING' },
      },
    ],
  },

  {
    id: 'fallen_ally',
    title: 'Fallen Ally',
    flavor: 'A soldier from another company lies at the crossroads, their last breath spent. Their gear is intact.',
    choices: [
      {
        label: 'Take their weapon',
        description: 'A fine Ranger\'s Poison Arrow scroll. Add to deck.',
        effect: { type: 'ADD_CARD', cardId: 'poison_arrow' },
      },
      {
        label: 'Take their coin',
        description: 'The dead have no use for gold. Gain 22 gold.',
        effect: { type: 'GAIN_GOLD', amount: 22 },
      },
      {
        label: 'Pay respects',
        description: 'Honor the fallen. The gesture restores morale. Heal 5 HP.',
        effect: { type: 'HEAL', amount: 5 },
      },
    ],
  },

  {
    id: 'wandering_bard',
    title: 'The Wandering Bard',
    flavor: 'A bard with haunted eyes offers songs, stories — and perhaps something stranger — for a price.',
    choices: [
      {
        label: 'Listen to the ballad',
        description: 'An uplifting war-song. Your wounds feel lighter. Heal 7 HP.',
        effect: { type: 'HEAL', amount: 7 },
      },
      {
        label: 'Buy their songbook (30 gold)',
        description: 'Ancient hunting melodies — Envenomed Ranger relic.',
        effect: { type: 'SPEND_GOLD_GAIN_RELIC', cost: 30, relicId: 'envenomed_ranger' },
      },
      {
        label: 'Move on',
        description: 'No time for music.',
        effect: { type: 'NOTHING' },
      },
    ],
  },
];

/**
 * Pick a deterministic event from the pool using a simple hash of the node ID,
 * so the same event node always shows the same event within a run.
 */
export function pickEventForNode(nodeId: string): EventDef {
  const hash = nodeId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return EVENT_POOL[hash % EVENT_POOL.length];
}
