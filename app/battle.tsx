/**
 * battle.tsx — BattleScreen
 *
 * Core gameplay screen. In run mode (when RunContext has an active run),
 * it uses the run's formation, deck, HP, and relics. After a victory it
 * navigates to the Reward screen and syncs gold/HP back to the run. On
 * defeat the run ends and the player returns to the main menu.
 *
 * When accessed without an active run (standalone / Phase 1 mode), it falls
 * back to createInitialBattleState() — identical to Phase 1 behaviour.
 */

import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  battleReducer,
  createInitialBattleState,
  createBattleFromRun,
  BattleAction,
} from '@/src/engine/battle';
import { Position } from '@/src/engine/types';
import { useRun } from '@/src/context/RunContext';
import { findNode } from '@/src/engine/run';
import { getFormationById } from '@/src/engine/formations';

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

const LEVEL_TYPE_LABEL: Record<string, string> = {
  skirmish:  'SKIRMISH',
  gauntlet:  'GAUNTLET',
  corridor:  'CORRIDOR',
  lava_pit:  'LAVA PIT',
  boss:      'BOSS',
};

// ─── Initialiser ──────────────────────────────────────────────────────────────

/**
 * Called once by useReducer. Tries to build battle state from the active run;
 * falls back to the Phase 1 default if no run is active.
 */
function initBattleState(context: { run: ReturnType<typeof useRun>['run'] }) {
  const { run } = context;
  if (!run) return createInitialBattleState();

  const currentNode = run.currentNodeId
    ? findNode(run.map, run.currentNodeId)
    : null;
  const formation = currentNode?.formationId
    ? getFormationById(currentNode.formationId)
    : null;

  if (!formation) return createInitialBattleState();

  return createBattleFromRun(run, formation);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BattleScreen() {
  const router = useRouter();
  const { run, dispatch: runDispatch } = useRun();

  // Capture the run snapshot at mount time so the battle doesn't mutate mid-fight
  const runRef = useRef(run);
  runRef.current = run;

  const [state, dispatch] = useReducer(
    battleReducer,
    { run },
    initBattleState,
  );

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

  // ── Handle battle end ─────────────────────────────────────────────────────
  const battleEndHandled = useRef(false);
  useEffect(() => {
    if (state.phase !== 'battle_over') return;
    if (battleEndHandled.current) return;
    battleEndHandled.current = true;

    if (state.winner === 'player') {
      // Sync results back to run state
      if (run) {
        runDispatch({
          type: 'COMPLETE_BATTLE',
          goldEarned: state.gold,
          hpAfterBattle: state.playerHp,
        });
      }
      // Navigate to reward screen after a short pause
      const t = setTimeout(() => {
        if (run) {
          router.replace('/reward');
        }
      }, 1200);
      return () => clearTimeout(t);
    } else {
      // Defeat — end the run
      if (run) {
        const t = setTimeout(() => {
          runDispatch({ type: 'END_RUN' });
          router.replace('/');
        }, 2000);
        return () => clearTimeout(t);
      }
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
      if (piece) dispatch({ type: 'SELECT_PIECE', pieceId: piece.id });
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
    if (run) {
      // In run mode, restart means go back to map (battle already resolved)
      router.replace('/map');
    } else {
      dispatch({ type: 'RESTART' });
    }
  }, [run]);

  // ── Derived values ────────────────────────────────────────────────────────

  const hpPercent = state.maxPlayerHp > 0 ? state.playerHp / state.maxPlayerHp : 0;
  const hpBarColor =
    hpPercent > 0.5 ? '#4CAF50' :
    hpPercent > 0.25 ? '#FF9800' :
    '#F44336';

  const phaseLabel = PHASE_LABEL[state.phase] ?? state.phase;
  const isEnemyTurn  = state.phase === 'enemy_turn';
  const isBattleOver = state.phase === 'battle_over';

  const enemyCount  = state.pieces.filter(p => p.team === 'enemy').length;
  const playerCount = state.pieces.filter(p => p.team === 'player').length;

  // Formation name for the header (if in run mode)
  const currentNode = run?.currentNodeId ? findNode(run.map, run.currentNodeId) : null;
  const formation   = currentNode?.formationId ? getFormationById(currentNode.formationId) : null;
  const battleTitle = formation ? formation.name : 'Battle';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* ── Top HUD ─────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Map</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.turnText}>{battleTitle} · Turn {state.turn}</Text>
          <Text style={styles.phaseText}>{phaseLabel}</Text>
        </View>
        <View style={styles.pieceCounts}>
          <Text style={styles.countText}>Party ×{playerCount}</Text>
          <Text style={styles.countTextEnemy}>Enemy ×{enemyCount}</Text>
        </View>
      </View>

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
        onPress={state.phase === 'player_select_destination' ? handleDeselect : undefined}
      >
        <BoardRenderer state={state} onSquarePress={handleSquarePress} />
      </TouchableOpacity>

      {/* ── Level Type / Win Condition Banner ────────────────────────────── */}
      {state.levelType && state.levelType !== 'skirmish' && (
        <View style={[
          styles.winConditionBanner,
          state.levelType === 'gauntlet' && styles.gauntletBanner,
          state.levelType === 'lava_pit' && styles.lavaBanner,
          state.levelType === 'corridor' && styles.corridorBanner,
          state.levelType === 'boss'     && styles.bossBanner,
        ]}>
          <Text style={styles.levelTypeTag}>
            {LEVEL_TYPE_LABEL[state.levelType] ?? state.levelType.toUpperCase()}
          </Text>
          {state.winCondition?.type === 'survive_turns' && (
            <Text style={styles.winConditionText}>
              Survive {state.gauntletTurnsLeft > 0 ? state.gauntletTurnsLeft : 0} more turn{state.gauntletTurnsLeft !== 1 ? 's' : ''}
            </Text>
          )}
          {state.winCondition?.type === 'eliminate_all' && state.levelType !== 'skirmish' && (
            <Text style={styles.winConditionText}>Eliminate all enemies</Text>
          )}
        </View>
      )}

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
              ? run
                ? `You earned ${state.gold} gold! Preparing rewards…`
                : `You earned ${state.gold} gold!`
              : run
                ? 'Your run has ended.'
                : 'Your Hero has fallen.'}
          </Text>

          {/* Only show replay buttons in standalone mode */}
          {!run && (
            <>
              <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
                <Text style={styles.restartBtnText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => router.replace('/')}>
                <Text style={styles.menuBtnText}>Main Menu</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── Deselect hint ────────────────────────────────────────────────── */}
      {(state.phase === 'player_select_piece' || state.phase === 'player_select_destination') && (
        <TouchableOpacity style={styles.deselectHint} onPress={handleDeselect}>
          <Text style={styles.deselectHintText}>
            {state.phase === 'player_select_piece'
              ? 'Tap to cancel card selection'
              : 'Tap to deselect piece'}
          </Text>
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
  winConditionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  gauntletBanner: { backgroundColor: '#2a1a00' },
  lavaBanner:     { backgroundColor: '#2a0d00' },
  corridorBanner: { backgroundColor: '#0d1a2a' },
  bossBanner:     { backgroundColor: '#2a0010' },
  levelTypeTag: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  winConditionText: {
    color: '#aaa',
    fontSize: 10,
    flex: 1,
  },
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
    maxWidth: 280,
    lineHeight: 26,
  },
  restartBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  restartBtnText: {
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
