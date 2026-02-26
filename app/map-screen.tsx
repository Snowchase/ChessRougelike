/**
 * map-screen.tsx — Overworld Dungeon Grid
 *
 * The player navigates a 7×7 dungeon tile-by-tile using 4-directional movement.
 * Fog of war: only the start tile, the boss tile, and tiles adjacent to visited
 * positions are revealed. Unrevealed tiles appear as dark fog squares.
 *
 * Tile interactions:
 *   Fight / Elite / Boss → navigate to /battle?encounterId=xxx
 *   Shop                 → navigate to /shop
 *   Rest                 → inline heal modal
 *   Event                → inline placeholder modal
 *   Corridor             → just walk through (auto-completed on entry)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useRun } from '@/src/context/RunContext';
import {
  Tile,
  TileType,
  TILE_ICONS,
  TILE_BG,
  TILE_BORDER,
  TILE_LABEL,
  GRID_SIZE,
  isAdjacent,
  adjacentPositions,
} from '@/src/engine/overworld';
import { RELIC_DEFINITIONS } from '@/src/engine/relics';

// ─── Sizing ───────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const TILE_SIZE = Math.floor((SCREEN_W - 32) / GRID_SIZE); // fit grid edge-to-edge with 16px padding each side
const TILE_GAP = 3;

// ─── Tile colours ─────────────────────────────────────────────────────────────

const FOG_BG     = '#070710';
const PLAYER_BG  = '#1a3a6a';
const PLAYER_BORDER = '#5a9aff';
const REACHABLE_BORDER = '#FFD700';
const VISITED_ALPHA = 0.55;

// ─── Single tile ──────────────────────────────────────────────────────────────

interface TileButtonProps {
  tile: Tile;
  isPlayer: boolean;
  isReachable: boolean;
  onPress: () => void;
}

function TileButton({ tile, isPlayer, isReachable, onPress }: TileButtonProps) {
  const { revealed, visited, type } = tile;

  if (!revealed) {
    // Fog — tap does nothing but show a dark square
    return (
      <View style={[styles.tile, { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: FOG_BG, borderColor: '#111' }]} />
    );
  }

  const bg     = isPlayer ? PLAYER_BG : TILE_BG[type];
  const border = isPlayer ? PLAYER_BORDER : isReachable ? REACHABLE_BORDER : TILE_BORDER[type];
  const label  = TILE_LABEL[type];
  const icon   = type === 'corridor' ? '' : TILE_ICONS[type];

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          width: TILE_SIZE,
          height: TILE_SIZE,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isPlayer || isReachable ? 2 : 1,
          opacity: visited && !isPlayer ? VISITED_ALPHA : 1,
        },
      ]}
      onPress={onPress}
      disabled={!isReachable && !isPlayer}
      activeOpacity={0.75}
    >
      {isPlayer && (
        <Text style={styles.playerIcon}>♚</Text>
      )}
      {!isPlayer && icon !== '' && (
        <Text style={[styles.tileIcon, type === 'boss' && styles.bossIcon]}>{icon}</Text>
      )}
      {!isPlayer && label !== '' && (
        <Text style={[styles.tileLabel, type === 'boss' && styles.bossLabel]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Rest Modal ───────────────────────────────────────────────────────────────

function RestModal({
  visible, hp, maxHp, onHeal, onLeave,
}: { visible: boolean; hp: number; maxHp: number; onHeal: () => void; onLeave: () => void }) {
  const healAmt = Math.floor(maxHp * 0.3);
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>🔥 Rest Site</Text>
          <Text style={styles.modalBody}>You find a moment of peace to recuperate.</Text>
          <Text style={styles.modalHp}>❤ {hp} / {maxHp}</Text>
          <TouchableOpacity style={styles.modalPrimary} onPress={onHeal}>
            <Text style={styles.modalPrimaryText}>Heal +{healAmt} HP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSecondary} onPress={onLeave}>
            <Text style={styles.modalSecondaryText}>Rest and Move On</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Event Modal ──────────────────────────────────────────────────────────────

function EventModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>❓ Mystery Event</Text>
          <Text style={styles.modalBody}>
            A hooded figure steps from the shadows...{'\n\n'}
            "I sense great power in you, traveller."
          </Text>
          <Text style={styles.modalNote}>(Full event system coming in Phase 3)</Text>
          <TouchableOpacity style={styles.modalPrimary} onPress={onClose}>
            <Text style={styles.modalPrimaryText}>Move On</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();
  const { runState, dispatch } = useRun();

  const [restModalVisible,  setRestModalVisible]  = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  if (!runState) {
    router.replace('/');
    return null;
  }

  const { grid, playerRow, playerCol, hp, maxHp, gold, relicIds, act } = runState;

  // Compute which tiles the player can move to
  const reachableSet = new Set<string>();
  for (const [r, c] of adjacentPositions(playerRow, playerCol)) {
    const tile = grid[r][c];
    if (tile.revealed && !tile.visited) {
      reachableSet.add(`${r},${c}`);
    }
  }

  function handleTilePress(tile: Tile) {
    if (!isAdjacent(playerRow, playerCol, tile.row, tile.col)) return;
    if (!tile.revealed || tile.visited) return;

    // Move player to the tile
    dispatch({ type: 'MOVE_TO', row: tile.row, col: tile.col });

    // Route based on tile type
    switch (tile.type) {
      case 'fight':
      case 'elite':
      case 'boss':
        router.push(`/battle?encounterId=${tile.encounterId ?? 'normal_fight_1'}`);
        break;

      case 'shop':
        router.push('/shop');
        break;

      case 'rest':
        setRestModalVisible(true);
        break;

      case 'event':
        setEventModalVisible(true);
        break;

      case 'corridor':
      case 'start':
        // auto-completed in MOVE_TO reducer — nothing else to do
        break;
    }
  }

  function handleHeal() {
    const healAmt = Math.floor(maxHp * 0.3);
    dispatch({ type: 'HEAL', amount: healAmt, cost: 0 });
    dispatch({ type: 'COMPLETE_TILE', finalHp: Math.min(hp + healAmt, maxHp), goldEarned: 0 });
    setRestModalVisible(false);
  }

  function handleRestLeave() {
    dispatch({ type: 'COMPLETE_TILE', finalHp: hp, goldEarned: 0 });
    setRestModalVisible(false);
  }

  function handleEventClose() {
    dispatch({ type: 'COMPLETE_TILE', finalHp: hp, goldEarned: 0 });
    setEventModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#070710" />

      {/* HUD */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.abandonBtn} onPress={() => router.replace('/')}>
          <Text style={styles.abandonText}>× Abandon</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.actLabel}>Act {act} — Dungeon</Text>
          <Text style={styles.posLabel}>({playerRow},{playerCol})</Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.hpText}>❤ {hp}/{maxHp}</Text>
          <Text style={styles.goldText}>💰 {gold}</Text>
        </View>
      </View>

      {/* Relics strip */}
      {relicIds.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.relicsScroll}
          contentContainerStyle={styles.relicsContent}
        >
          {relicIds.map(id => {
            const def = RELIC_DEFINITIONS.find(r => r.id === id);
            return (
              <View key={id} style={styles.relicBadge}>
                <Text style={styles.relicText}>{def?.name ?? id}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Tap an adjacent tile to move. Fog hides unexplored rooms.</Text>
      </View>

      {/* Grid */}
      <View style={styles.gridWrapper}>
        <View style={styles.grid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((tile, c) => (
                <React.Fragment key={`${r},${c}`}>
                  <TileButton
                    tile={tile}
                    isPlayer={r === playerRow && c === playerCol}
                    isReachable={reachableSet.has(`${r},${c}`)}
                    onPress={() => handleTilePress(tile)}
                  />
                  {c < GRID_SIZE - 1 && <View style={{ width: TILE_GAP }} />}
                </React.Fragment>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Move instructions when all adjacent tiles visited */}
      {reachableSet.size === 0 && !runState.runOver && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>
            No new tiles to move to. The boss awaits at the bottom-right corner.
          </Text>
        </View>
      )}

      {/* Modals */}
      <RestModal
        visible={restModalVisible}
        hp={hp}
        maxHp={maxHp}
        onHeal={handleHeal}
        onLeave={handleRestLeave}
      />
      <EventModal
        visible={eventModalVisible}
        onClose={handleEventClose}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#070710',
  },

  // HUD
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0d0d1e',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3a',
  },
  abandonBtn: {
    backgroundColor: '#2a0a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  abandonText: {
    color: '#aa3333',
    fontSize: 12,
    fontWeight: '700',
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
  },
  actLabel: {
    color: '#7a7aff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  posLabel: {
    color: '#333',
    fontSize: 10,
  },
  hudRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  hpText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '700',
  },
  goldText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },

  // Relics
  relicsScroll: {
    maxHeight: 32,
    backgroundColor: '#0d0d1e',
  },
  relicsContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
  },
  relicBadge: {
    backgroundColor: '#1e1e3e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  relicText: {
    color: '#9a9aff',
    fontSize: 11,
  },

  // Legend
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0a0a18',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  legendText: {
    color: '#3a3a5a',
    fontSize: 11,
    textAlign: 'center',
  },

  // Grid
  gridWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  grid: {
    gap: TILE_GAP,
  },
  gridRow: {
    flexDirection: 'row',
  },

  // Tile
  tile: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  playerIcon: {
    fontSize: TILE_SIZE * 0.45,
    color: '#aaddff',
  },
  tileIcon: {
    fontSize: TILE_SIZE * 0.38,
    lineHeight: TILE_SIZE * 0.44,
  },
  bossIcon: {
    fontSize: TILE_SIZE * 0.44,
  },
  tileLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bossLabel: {
    color: '#cc2222',
    fontSize: 8,
    fontWeight: '800',
  },

  // Stuck banner
  stuckBanner: {
    backgroundColor: '#1a1a0a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  stuckText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Modals
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#0d0d1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBody: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalHp: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalNote: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalPrimary: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSecondary: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#777',
    fontSize: 14,
  },
});
