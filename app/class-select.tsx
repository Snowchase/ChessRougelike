/**
 * class-select.tsx — Class Selection Screen
 *
 * The player chooses a starting loadout before beginning a run.
 * Each class has a unique set of starting pieces, bonus card, relic, and HP.
 *
 * Flow: MainMenu → ClassSelect → MapScreen
 */

import React from 'react';
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

import { CLASS_DEFINITIONS, PlayerClass, ClassDefinition } from '@/src/engine/run';
import { RELIC_DEFINITIONS } from '@/src/engine/relics';
import { useRun } from '@/src/context/RunContext';

// ─── Relic lookup ─────────────────────────────────────────────────────────────

function relicName(id: string): string {
  return RELIC_DEFINITIONS.find(r => r.id === id)?.name ?? id;
}

function relicDesc(id: string): string {
  return RELIC_DEFINITIONS.find(r => r.id === id)?.description ?? '';
}

// ─── Piece type emoji ─────────────────────────────────────────────────────────

const PIECE_EMOJI: Record<string, string> = {
  KING: '♚', QUEEN: '♛', ROOK: '♜', BISHOP: '♝', KNIGHT: '♞', PAWN: '♟',
};

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({
  classDef,
  onSelect,
}: {
  classDef: ClassDefinition;
  onSelect: () => void;
}) {
  // Count piece types for display
  const pieceCounts: Record<string, number> = {};
  for (const sp of classDef.startingPlayerPieces) {
    pieceCounts[sp.type] = (pieceCounts[sp.type] ?? 0) + 1;
  }

  const relicId = classDef.startingRelicIds[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onSelect} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.classEmoji}>{classDef.emoji}</Text>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.className}>{classDef.name}</Text>
          <Text style={styles.classDesc}>{classDef.description}</Text>
        </View>
      </View>

      {/* Starting pieces */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>STARTING PIECES</Text>
        <View style={styles.pieceRow}>
          {(Object.entries(pieceCounts) as [string, number][]).map(([type, count]) => (
            <View key={type} style={styles.pieceChip}>
              <Text style={styles.pieceEmoji}>{PIECE_EMOJI[type]}</Text>
              {count > 1 && <Text style={styles.pieceCount}>×{count}</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>HP</Text>
          <Text style={styles.statValue}>{classDef.startingHp}</Text>
        </View>

        {relicId && (
          <View style={[styles.statChip, styles.relicChip]}>
            <Text style={styles.statLabel}>RELIC</Text>
            <Text style={styles.statValue}>{relicName(relicId)}</Text>
          </View>
        )}
      </View>

      {relicId && (
        <Text style={styles.relicDesc}>{relicDesc(relicId)}</Text>
      )}

      <View style={styles.selectBtn}>
        <Text style={styles.selectBtnText}>Select →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClassSelectScreen() {
  const router = useRouter();
  const { dispatch } = useRun();

  function handleSelect(playerClass: PlayerClass) {
    dispatch({ type: 'START_RUN', playerClass });
    router.replace('/map-screen');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose Your Class</Text>
          <Text style={styles.headerSub}>Your starting loadout defines your strategy</Text>
        </View>
      </View>

      {/* Class cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CLASS_DEFINITIONS.map(classDef => (
          <React.Fragment key={classDef.id}>
            <ClassCard
              classDef={classDef}
              onSelect={() => handleSelect(classDef.id)}
            />
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d18',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Class card
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  classEmoji: {
    fontSize: 40,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  className: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  classDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },

  // Sections
  section: {
    gap: 6,
  },
  sectionLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pieceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pieceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252540',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pieceEmoji: {
    fontSize: 18,
  },
  pieceCount: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '700',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: '#252540',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  relicChip: {
    flex: 1,
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  relicDesc: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Select button
  selectBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  selectBtnText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
});
