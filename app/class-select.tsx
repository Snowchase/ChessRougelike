/**
 * class-select.tsx — Starting Class Selection Screen
 *
 * The player picks one of three starting classes (WARRIOR / RANGER / TRICKSTER).
 * Each class determines starting HP, piece composition, deck, and relic.
 * Selecting a class starts a new run and navigates to the map.
 */

import React, { useState } from 'react';
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
import { CLASS_DEFINITIONS, ClassDefinition, StartingClass } from '@/src/engine/run';

// ─── Piece icon labels ────────────────────────────────────────────────────────

const PIECE_LABEL: Record<string, string> = {
  HERO:     'Hr',
  ROGUE:    'Rg',
  BRAWLER:  'Bw',
  RANGER:   'Rn',
  GUARDIAN: 'Gu',
  WITCH:    'Wt',
};

const CLASS_COLOR: Record<StartingClass, string> = {
  WARRIOR:  '#4a7fcb',
  RANGER:   '#4caf50',
  TRICKSTER:'#9c27b0',
};

const CLASS_ICON: Record<StartingClass, string> = {
  WARRIOR:  '🛡',
  RANGER:   '🏹',
  TRICKSTER:'🎭',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassSelectScreen() {
  const router = useRouter();
  const { dispatch } = useRun();
  const [selected, setSelected] = useState<StartingClass | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    dispatch({ type: 'START_RUN', startingClass: selected });
    router.replace('/map');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Class</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {CLASS_DEFINITIONS.map(cls => (
          <ClassCard
            key={cls.id}
            cls={cls}
            isSelected={selected === cls.id}
            onPress={() => setSelected(cls.id)}
          />
        ))}
      </ScrollView>

      {selected && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>
              Begin Run as {CLASS_DEFINITIONS.find(c => c.id === selected)?.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── ClassCard ────────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  isSelected,
  onPress,
}: {
  cls: ClassDefinition;
  isSelected: boolean;
  onPress: () => void;
}) {
  const color = CLASS_COLOR[cls.id];

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && { borderColor: color, borderWidth: 2.5 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <Text style={styles.classIcon}>{CLASS_ICON[cls.id]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.className, { color }]}>{cls.name}</Text>
          <Text style={styles.classTagline}>{cls.tagline}</Text>
        </View>
        <View style={styles.hpBadge}>
          <Text style={styles.hpBadgeLabel}>HP</Text>
          <Text style={[styles.hpBadgeValue, { color }]}>{cls.startingHp}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.classDesc}>{cls.description}</Text>

      {/* Piece roster */}
      <View style={styles.pieceRow}>
        {cls.pieces.map((type, i) => (
          <View key={i} style={[styles.pieceBadge, { borderColor: color }]}>
            <Text style={[styles.pieceBadgeText, { color }]}>{PIECE_LABEL[type]}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#ccc',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#16162a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIcon: {
    fontSize: 32,
  },
  className: {
    fontSize: 20,
    fontWeight: '800',
  },
  classTagline: {
    color: '#777',
    fontSize: 12,
    fontStyle: 'italic',
  },
  hpBadge: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hpBadgeLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hpBadgeValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  classDesc: {
    color: '#999',
    fontSize: 13,
    lineHeight: 19,
  },
  pieceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pieceBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pieceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  confirmBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
  },
});
