/**
 * events.ts — Event Dispatcher
 *
 * Iterates all active relics, finds those matching the event trigger,
 * and applies them in order to produce a new BattleState.
 */

import { BattleState, GameEvent, EventType } from './types';
import { RELIC_DEFINITIONS } from './relics';

export const EVENTS = {
  ON_CAPTURE:     'onCapture'     as EventType,
  ON_CARD_PLAY:   'onCardPlay'    as EventType,
  ON_LAND:        'onLand'        as EventType,
  ON_TURN_START:  'onTurnStart'   as EventType,
  ON_TURN_END:    'onTurnEnd'     as EventType,
  ON_PIECE_DEATH: 'onPieceDeath'  as EventType,
  ON_BATTLE_WIN:  'onBattleWin'   as EventType,
} as const;

/**
 * Dispatch an event and apply all matching relic effects.
 * Returns the updated BattleState.
 */
export function dispatchEvent(state: BattleState, event: GameEvent): BattleState {
  // Deep-copy each relic instance so counter mutations stay isolated from the
  // previous state reference (preserves immutability across dispatches).
  let current: BattleState = {
    ...state,
    relics: state.relics.map(r => ({ ...r })),
  };

  for (const relicInstance of current.relics) {
    const def = RELIC_DEFINITIONS.find(r => r.id === relicInstance.relicId);
    if (!def || def.trigger !== event.type) continue;

    const changes = def.apply(current, event, relicInstance);
    current = { ...current, ...changes };
  }

  return current;
}

/**
 * Convenience: dispatch multiple events in sequence.
 */
export function dispatchSequence(state: BattleState, events: GameEvent[]): BattleState {
  return events.reduce((s, ev) => dispatchEvent(s, ev), state);
}
