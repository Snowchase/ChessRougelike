/**
 * map.tsx — Act Map Screen
 *
 * Shows the branching path through Act 1.
 * The player taps a reachable node to enter it.
 *
 * Node types:
 *   ⚔  Normal Fight
 *   💀 Elite Fight
 *   🛒 Shop
 *   🔥 Rest (heal)
 *   ❓ Mystery Event (placeholder)
 *   👑 Boss
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useRun } from '@/src/context/RunContext';
import {
  MapNode,
  NodeType,
  getReachableNodeIds,
} from '@/src/engine/run';

// ─── Node display config ──────────────────────────────────────────────────────

const NODE_ICON: Record<NodeType, string> = {
  normal: '⚔',
  elite:  '💀',
  shop:   '🛒',
  rest:   '🔥',
  event:  '❓',
  boss:   '👑',
};

const NODE_LABEL: Record<NodeType, string> = {
  normal: 'Fight',
  elite:  'Elite',
  shop:   'Shop',
  rest:   'Rest',
  event:  'Event',
  boss:   'Boss',
};

const NODE_COLOR: Record<NodeType, string> = {
  normal: '#4a7fcb',
  elite:  '#c0392b',
  shop:   '#f39c12',
  rest:   '#27ae60',
  event:  '#8e44ad',
  boss:   '#e74c3c',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();
  const { run, dispatch } = useRun();

  if (!run) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerMsg}>
          <Text style={styles.centerMsgText}>No active run. Start a new run first.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Text style={styles.backBtnText}>← Main Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const reachable = getReachableNodeIds(run.map, run.currentNodeId);

  const handleNodePress = (node: MapNode) => {
    if (!reachable.includes(node.id)) return;

    dispatch({ type: 'VISIT_NODE', nodeId: node.id });

    switch (node.type) {
      case 'normal':
      case 'elite':
      case 'boss':
        router.push('/battle');
        break;
      case 'shop':
        router.push('/shop');
        break;
      case 'rest':
        // Heal 5 HP, then stay on map
        dispatch({ type: 'HEAL', amount: 5 });
        break;
      case 'event':
        // Placeholder — just heal a little for now
        dispatch({ type: 'HEAL', amount: 2 });
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/')}>
          <Text style={styles.menuBtnText}>☰ Menu</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Act {run.currentAct} — The Dungeon</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>❤ {run.playerHp}/{run.maxPlayerHp}</Text>
          <Text style={styles.statText}>💰 {run.gold}</Text>
        </View>
      </View>

      {/* Map grid — rendered bottom-to-top (row 5 = boss at top visually) */}
      <ScrollView contentContainerStyle={styles.mapContainer}>
        {[...run.map].reverse().map((row, reversedRowIdx) => {
          const rowIdx = run.map.length - 1 - reversedRowIdx;
          return (
            <View key={rowIdx} style={styles.mapRow}>
              {row.map(node => {
                const isVisited   = run.visitedNodeIds.includes(node.id);
                const isCurrent   = run.currentNodeId === node.id;
                const isReachable = reachable.includes(node.id);
                const isLocked    = !isReachable && !isVisited && !isCurrent;
                const color       = NODE_COLOR[node.type];

                return (
                  <TouchableOpacity
                    key={node.id}
                    style={[
                      styles.nodeBtn,
                      { borderColor: isLocked ? '#252530' : color },
                      isVisited   && styles.nodeBtnVisited,
                      isCurrent   && styles.nodeBtnCurrent,
                      isReachable && styles.nodeBtnReachable,
                      isLocked    && styles.nodeBtnLocked,
                    ]}
                    onPress={() => handleNodePress(node)}
                    activeOpacity={isReachable ? 0.75 : 1}
                    disabled={!isReachable}
                  >
                    <Text style={[styles.nodeIcon, isLocked && styles.nodeIconLocked]}>
                      {NODE_ICON[node.type]}
                    </Text>
                    <Text style={[
                      styles.nodeLabel,
                      { color: isVisited ? '#444' : isLocked ? '#333' : color },
                    ]}>
                      {NODE_LABEL[node.type]}
                    </Text>
                    {isCurrent && <Text style={styles.currentMarker}>●</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Legend */}
        <View style={styles.legend}>
          {(Object.entries(NODE_ICON) as [NodeType, string][]).map(([type, icon]) => (
            <Text key={type} style={styles.legendItem}>
              <Text style={{ color: NODE_COLOR[type] }}>{icon}</Text>
              {' '}{NODE_LABEL[type]}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Run info footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Battles won: {run.battlesWon}  ·  Deck: {run.deck.length} cards  ·  Relics: {run.relics.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d18',
  },
  centerMsg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  centerMsgText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 6,
  },
  menuBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  menuBtnText: {
    color: '#ccc',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  statText: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '600',
  },
  mapContainer: {
    padding: 24,
    gap: 20,
    alignItems: 'center',
  },
  mapRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  nodeBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#16162a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  nodeBtnVisited: {
    backgroundColor: '#0d0d18',
    borderColor: '#222',
    opacity: 0.45,
  },
  nodeBtnCurrent: {
    backgroundColor: '#1a1a3a',
  },
  nodeBtnReachable: {
    backgroundColor: '#1e1e38',
    shadowColor: '#7a7aff',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeBtnLocked: {
    backgroundColor: '#0a0a10',
    opacity: 0.3,
  },
  nodeIcon: {
    fontSize: 26,
  },
  nodeIconLocked: {
    opacity: 0.4,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentMarker: {
    position: 'absolute',
    top: 4,
    right: 6,
    color: '#FFD700',
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  legendItem: {
    color: '#666',
    fontSize: 12,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    alignItems: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  backBtnText: {
    color: '#ccc',
    fontSize: 15,
  },
});
