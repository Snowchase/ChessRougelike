/**
 * map-screen.tsx — Run Map
 *
 * Displays the branching Slay the Spire-style map. The player taps
 * a reachable node to progress. Visited nodes are dimmed; future
 * nodes are locked.
 *
 * Node routing:
 *   fight / elite / boss → /battle?encounterId=xxx
 *   shop  → /shop
 *   rest  → inline heal modal
 *   event → inline placeholder modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useRun } from '@/src/context/RunContext';
import { MapNode, NODE_ICONS, NODE_LABELS, NodeType } from '@/src/engine/map';
import { RELIC_DEFINITIONS } from '@/src/engine/relics';

// ─── Node colours by type ─────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  fight: '#c0392b',
  elite: '#8e44ad',
  shop:  '#d4a017',
  rest:  '#1a7a4a',
  event: '#2471a3',
  boss:  '#b7000d',
};

// ─── Single map node button ───────────────────────────────────────────────────

function NodeButton({
  node,
  isCurrent,
  onPress,
}: {
  node: MapNode;
  isCurrent: boolean;
  onPress: () => void;
}) {
  const color = NODE_COLORS[node.type];
  const opacity = node.visited ? 0.35 : node.reachable ? 1 : 0.25;

  return (
    <TouchableOpacity
      style={[
        styles.node,
        { borderColor: color, opacity },
        isCurrent && styles.nodeActive,
        node.type === 'boss' && styles.nodeBoss,
      ]}
      onPress={onPress}
      disabled={!node.reachable || node.visited}
      activeOpacity={0.75}
    >
      <Text style={styles.nodeIcon}>{NODE_ICONS[node.type]}</Text>
      <Text style={[styles.nodeLabel, { color }]}>{NODE_LABELS[node.type]}</Text>
    </TouchableOpacity>
  );
}

// ─── Rest Modal ───────────────────────────────────────────────────────────────

function RestModal({
  visible,
  hp,
  maxHp,
  onHeal,
  onLeave,
}: {
  visible: boolean;
  hp: number;
  maxHp: number;
  onHeal: () => void;
  onLeave: () => void;
}) {
  const healAmount = Math.floor(maxHp * 0.3);
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>🔥 Rest Site</Text>
          <Text style={styles.modalBody}>
            You find a moment of peace to recuperate.
          </Text>
          <View style={styles.modalHpRow}>
            <Text style={styles.modalHpText}>HP: {hp} / {maxHp}</Text>
          </View>
          <TouchableOpacity style={styles.modalPrimary} onPress={onHeal}>
            <Text style={styles.modalPrimaryText}>
              Heal {healAmount} HP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSecondary} onPress={onLeave}>
            <Text style={styles.modalSecondaryText}>Rest and Continue</Text>
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
            A hooded figure offers you a strange deal...{'\n\n'}
            "I can grant you power — for a price."
          </Text>
          <Text style={styles.modalNote}>
            (Full event system coming in Phase 3)
          </Text>
          <TouchableOpacity style={styles.modalPrimary} onPress={onClose}>
            <Text style={styles.modalPrimaryText}>Decline and Move On</Text>
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

  const [restModalVisible, setRestModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [pendingNode, setPendingNode] = useState<MapNode | null>(null);

  if (!runState) {
    // Should not happen — navigate back
    router.replace('/');
    return null;
  }

  function handleNodePress(node: MapNode) {
    dispatch({ type: 'SELECT_NODE', row: node.row, col: node.col });

    switch (node.type) {
      case 'fight':
      case 'elite':
      case 'boss':
        router.push(`/battle?encounterId=${node.encounterId ?? 'normal_fight_1'}`);
        break;

      case 'shop':
        router.push('/shop');
        break;

      case 'rest':
        setPendingNode(node);
        setRestModalVisible(true);
        break;

      case 'event':
        setPendingNode(node);
        setEventModalVisible(true);
        break;
    }
  }

  function completeNode() {
    if (!pendingNode) return;
    dispatch({ type: 'COMPLETE_NODE', finalHp: runState!.hp, goldEarned: 0 });
    setPendingNode(null);
  }

  function handleHeal() {
    const healAmount = Math.floor(runState!.maxHp * 0.3);
    dispatch({ type: 'HEAL', amount: healAmount, cost: 0 });
    completeNode();
    setRestModalVisible(false);
  }

  function handleRestLeave() {
    completeNode();
    setRestModalVisible(false);
  }

  function handleEventClose() {
    completeNode();
    setEventModalVisible(false);
  }

  const { map, hp, maxHp, gold, relicIds, currentRow, currentCol, act } = runState;

  // Render map top-to-bottom (boss first, start last — gives a "climbing" feel)
  const reversedRows = [...map].reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* HUD */}
      <View style={styles.hud}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>× Abandon</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.actText}>Act {act}</Text>
          <Text style={styles.mapTitle}>Choose Your Path</Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.hpText}>❤ {hp}/{maxHp}</Text>
          <Text style={styles.goldText}>💰 {gold}</Text>
        </View>
      </View>

      {/* Relics bar */}
      {relicIds.length > 0 && (
        <View style={styles.relicsBar}>
          {relicIds.map(id => {
            const def = RELIC_DEFINITIONS.find(r => r.id === id);
            return (
              <View key={id} style={styles.relicBadge}>
                <Text style={styles.relicBadgeText}>{def?.name ?? id}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Map */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {reversedRows.map((row, reversedIdx) => {
          const actualRow = map.length - 1 - reversedIdx;
          return (
            <View key={actualRow} style={styles.mapRow}>
              {row.map((node, colIdx) => (
                <React.Fragment key={node.id}>
                  <NodeButton
                    node={node}
                    isCurrent={currentRow === actualRow && currentCol === colIdx}
                    onPress={() => handleNodePress(node)}
                  />
                </React.Fragment>
              ))}
            </View>
          );
        })}

        {/* Start label */}
        <View style={styles.startLabel}>
          <Text style={styles.startLabelText}>— START —</Text>
        </View>
      </ScrollView>

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
    backgroundColor: '#0d0d18',
  },

  // HUD
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    backgroundColor: '#3a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#cc4444',
    fontSize: 12,
    fontWeight: '700',
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
  },
  actText: {
    color: '#7a7aff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mapTitle: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '700',
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

  // Relics bar
  relicsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    backgroundColor: '#12122a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  relicBadge: {
    backgroundColor: '#252550',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  relicBadgeText: {
    color: '#9a9aff',
    fontSize: 11,
  },

  // Map
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 10,
  },
  mapRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  // Node
  node: {
    width: 72,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  nodeActive: {
    backgroundColor: '#252560',
  },
  nodeBoss: {
    width: 100,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
  },
  nodeIcon: {
    fontSize: 22,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  startLabel: {
    alignItems: 'center',
    marginTop: 8,
  },
  startLabelText: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 2,
  },

  // Modals
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 14,
    borderWidth: 1,
    borderColor: '#333',
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
  modalHpRow: {
    alignItems: 'center',
  },
  modalHpText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '700',
  },
  modalNote: {
    color: '#555',
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
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#888',
    fontSize: 14,
  },
});
