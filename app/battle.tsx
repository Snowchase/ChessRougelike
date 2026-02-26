/**
 * battle.tsx — BattleScreen
 *
 * The core gameplay screen. Wires together:
 *   - Battle reducer (game logic)
 *   - BoardRenderer (visual board)
 *   - CardHand (move card selection)
 *   - RelicDisplay (active relics)
 *   - HUD (HP, combo, turn info, enemy intent, game log)
 *
 * When invoked from the map (encounterId param is set), loads the
 * encounter from RunContext. Otherwise falls back to a standalone
 * practice battle.
 *
 * Phase flow:
 *   player_select_card → player_select_piece → player_select_destination
 *   → enemy_turn (auto) → player_select_card → ...
 */

import React, { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import {
  battleReducer,
  createInitialBattleState,
  createBattleStateFromEncounter,
  BattleAction,
} from '@/src/engine/battle';
import { Position } from '@/src/engine/types';
import { getEncounter, rollGold } from '@/src/engine/encounters';
import { CLASS_DEFINITIONS } from '@/src/engine/run';
import { useRun } from '@/src/context/RunContext';

import BoardRenderer from '@/components/game/BoardRenderer';
import CardHand from '@/components/game/CardHand';
import RelicDisplay from '@/components/game/RelicDisplay';

// ─── Phase Labels ─────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  player_select_card:        'Select a Card',
  player_select_piece:       'Select a Piece',
  player_select_destination: 'Select Destination',
  enemy_turn:                'Enemy Turn…',
  battle_over:               'Battle Over',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BattleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ encounterId?: string }>();
  const { runState, dispatch: runDispatch } = useRun();

  // ── Determine initial battle state ────────────────────────────────────────

  const { initialState, encounter, goldEarned } = useMemo(() => {
    const encId = params.encounterId;

    if (encId && runState) {
      const enc = getEncounter(encId);
      if (enc) {
        const classDef = CLASS_DEFINITIONS.find(c => c.id === runState.playerClass);
        if (classDef) {
          return {
            encounter: enc,
            goldEarned: rollGold(enc),
            initialState: createBattleStateFromEncounter(
              runState.hp,
              runState.maxHp,
              runState.deck,
              runState.relicIds,
              runState.pieceUpgrades,
              classDef.startingPlayerPieces,
              enc.enemyPieces,
              enc.script,
              enc.name,
            ),
          };
        }
      }
    }

    // Fallback: standalone practice battle (no run tracking)
    return {
      encounter: null,
      goldEarned: 0,
      initialState: createInitialBattleState(),
    };
  }, []); // Only computed once on mount

  const [state, dispatch] = useReducer(battleReducer, initialState);
  const logScrollRef = useRef<ScrollView>(null);

  // ── Auto-resolve enemy turn after a short delay ───────────────────────────
  useEffect(() => {
    if (state.phase !== 'enemy_turn') return;
    const timer = setTimeout(() => {
      dispatch({ type: 'ENEMY_MOVE' });
    }, 800);
    return () => clearTimeout(timer);
  }, [state.phase, state.turn]);

  // ── Auto-scroll log to bottom ─────────────────────────────────────────────
  useEffect(() => {
    logScrollRef.current?.scrollToEnd({ animated: true });
  }, [state.log.length]);

  // ── Sync battle outcome to run state (once) ───────────────────────────────
  const outcomeHandled = useRef(false);

  useEffect(() => {
    if (state.phase !== 'battle_over' || outcomeHandled.current) return;
    if (!encounter) return; // standalone mode — no run tracking

    outcomeHandled.current = true;

    if (state.winner === 'player') {
      runDispatch({
        type: 'COMPLETE_TILE',
        finalHp: state.playerHp,
        goldEarned,
      });
    } else {
      runDispatch({ type: 'RUN_LOST', finalHp: 0 });
    }
  }, [state.phase, state.winner]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSquarePress = useCallback((position: Position) => {
    const { phase } = state;

    if (phase === 'player_select_piece') {
      const piece = state.pieces.find(
        p => p.team === 'player' &&
             p.position.row === position.row &&
             p.position.col === position.col,
      );
      if (piece) {
        dispatch({ type: 'SELECT_PIECE', pieceId: piece.id });
      }
    } else if (phase === 'player_select_destination') {
      dispatch({ type: 'SELECT_DESTINATION', position });
    }
  }, [state]);

  const handleCardSelect = useCallback((cardId: string) => {
    dispatch({ type: 'SELECT_CARD', cardId });
  }, []);

  const handleDeselect = useCallback(() => {
    dispatch({ type: 'DESELECT' });
  }, []);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART' });
    outcomeHandled.current = false;
  }, []);

  function handleVictoryContinue() {
    if (encounter) {
      router.replace(`/reward?goldEarned=${goldEarned}&finalHp=${state.playerHp}`);
    } else {
      handleRestart();
    }
  }

  function handleDefeatContinue() {
    if (encounter) {
      router.replace('/');
    } else {
      router.back();
    }
  }

  // ── Derived display values ────────────────────────────────────────────────

  const hpPercent = state.maxPlayerHp > 0
    ? state.playerHp / state.maxPlayerHp
    : 0;

  const hpBarColor =
    hpPercent > 0.5 ? '#4CAF50' :
    hpPercent > 0.25 ? '#FF9800' :
    '#F44336';

  const phaseLabel = PHASE_LABEL[state.phase] ?? state.phase;
  const isBattleOver = state.phase === 'battle_over';

  const enemyCount  = state.pieces.filter(p => p.team === 'enemy').length;
  const playerCount = state.pieces.filter(p => p.team === 'player').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* ── Top HUD ─────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.hudCenter}>
          {encounter && (
            <Text style={styles.encounterName}>{encounter.name}</Text>
          )}
          <Text style={styles.turnText}>Turn {state.turn}</Text>
          <Text style={styles.phaseText}>{phaseLabel}</Text>
        </View>

        <View style={styles.pieceCounts}>
          <Text style={styles.countText}>♙×{playerCount}</Text>
          <Text style={styles.countTextEnemy}>♟×{enemyCount}</Text>
        </View>
      </View>

      {/* ── Boss Rule Banner ─────────────────────────────────────────────── */}
      {encounter?.bossRule && (
        <View style={styles.bossRuleBanner}>
          <Text style={styles.bossRuleText}>👑 {encounter.bossRule}</Text>
        </View>
      )}

      {/* ── HP Bar ──────────────────────────────────────────────────────── */}
      <View style={styles.hpRow}>
        <Text style={styles.hpLabel}>HP {state.playerHp}/{state.maxPlayerHp}</Text>
        <View style={styles.hpBarBg}>
          <View style={[styles.hpBarFill, { width: `${hpPercent * 100}%` as any, backgroundColor: hpBarColor }]} />
        </View>
        {state.consecutiveCaptures > 0 && (
          <Text style={styles.combo}>COMBO ×{state.consecutiveCaptures}</Text>
        )}
        <Text style={styles.gold}>💰 {state.gold}</Text>
      </View>

      {/* ── Relics ──────────────────────────────────────────────────────── */}
      <RelicDisplay relics={state.relics} />

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={
          state.phase === 'player_select_destination' ? handleDeselect : undefined
        }
      >
        <BoardRenderer state={state} onSquarePress={handleSquarePress} />
      </TouchableOpacity>

      {/* ── Enemy Intent Banner ──────────────────────────────────────────── */}
      <View style={styles.intentBanner}>
        <Text style={styles.intentLabel}>Enemy next: </Text>
        <Text style={styles.intentText}>{state.enemyIntent}</Text>
      </View>

      {/* ── Card Hand ───────────────────────────────────────────────────── */}
      {!isBattleOver && (
        <CardHand state={state} onCardSelect={handleCardSelect} />
      )}

      {/* ── Game Log ────────────────────────────────────────────────────── */}
      <View style={styles.logContainer}>
        <ScrollView
          ref={logScrollRef}
          style={styles.log}
          showsVerticalScrollIndicator={false}
        >
          {state.log.slice(-8).map((entry, i) => (
            <Text key={i} style={styles.logEntry}>{entry}</Text>
          ))}
        </ScrollView>
      </View>

      {/* ── Battle Over Overlay ──────────────────────────────────────────── */}
      {isBattleOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {state.winner === 'player' ? '⚔ Victory!' : '☠ Defeat'}
          </Text>
          <Text style={styles.overlaySubtitle}>
            {state.winner === 'player'
              ? `+${goldEarned} gold earned!`
              : 'Your king has fallen.'}
          </Text>

          {state.winner === 'player' ? (
            <TouchableOpacity style={styles.continueBtn} onPress={handleVictoryContinue}>
              <Text style={styles.continueBtnText}>
                {encounter ? 'Continue →' : 'Play Again'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {!encounter && (
                <TouchableOpacity style={styles.continueBtn} onPress={handleRestart}>
                  <Text style={styles.continueBtnText}>Try Again</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuBtn} onPress={handleDefeatContinue}>
                <Text style={styles.menuBtnText}>
                  {encounter ? '☠ Run Over — Return to Menu' : 'Main Menu'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── Deselect helper text ─────────────────────────────────────────── */}
      {state.phase === 'player_select_destination' && (
        <TouchableOpacity style={styles.deselectHint} onPress={handleDeselect}>
          <Text style={styles.deselectHintText}>Tap elsewhere to deselect</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111118',
  },

  // HUD
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  backBtnText: {
    color: '#ccc',
    fontSize: 13,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
  },
  encounterName: {
    color: '#7a7aff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  turnText: {
    color: '#aaa',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  phaseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pieceCounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  countText: {
    color: '#ccc',
    fontSize: 12,
  },
  countTextEnemy: {
    color: '#cc5555',
    fontSize: 12,
  },

  // Boss rule banner
  bossRuleBanner: {
    backgroundColor: '#2a0a0a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#5a0000',
  },
  bossRuleText: {
    color: '#e74c3c',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // HP bar
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
    backgroundColor: '#16162a',
  },
  hpLabel: {
    color: '#ccc',
    fontSize: 12,
    minWidth: 70,
  },
  hpBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  combo: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  gold: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },

  // Intent banner
  intentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e0a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  intentLabel: {
    color: '#888',
    fontSize: 11,
  },
  intentText: {
    color: '#FFA500',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },

  // Log
  logContainer: {
    height: 60,
    backgroundColor: '#0d0d1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
  },
  log: {
    flex: 1,
  },
  logEntry: {
    color: '#8a8a9a',
    fontSize: 10,
    lineHeight: 14,
  },

  // Battle over overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 100,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  overlaySubtitle: {
    color: '#ccc',
    fontSize: 18,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  continueBtnText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
  },
  menuBtn: {
    borderWidth: 1,
    borderColor: '#555',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  menuBtnText: {
    color: '#aaa',
    fontSize: 15,
  },

  // Deselect hint
  deselectHint: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  deselectHintText: {
    color: '#555',
    fontSize: 10,
    fontStyle: 'italic',
  },
});
