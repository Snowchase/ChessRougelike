/**
 * upgrade.tsx — Piece Upgrade Selection
 *
 * After each battle (and card reward), the player chooses 1 of 3 random
 * piece upgrades. Upgrades persist across the entire run and apply to
 * matching pieces in future battles.
 *
 * Flow: RewardScreen → UpgradeScreen → MapScreen
 */

import React, { useMemo } from 'react';
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

import { useRun } from '@/src/context/RunContext';
import {
  UPGRADE_DEFINITIONS,
  CLASS_DEFINITIONS,
  UpgradeDefinition,
} from '@/src/engine/run';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PIECE_EMOJI: Record<string, string> = {
  KING: '♚', QUEEN: '♛', ROOK: '♜', BISHOP: '♝', KNIGHT: '♞', PAWN: '♟',
};

function pickUpgradeOptions(
  classDef: (typeof CLASS_DEFINITIONS)[number],
  existingUpgrades: { pieceType: string }[],
  count: number,
): UpgradeDefinition[] {
  // Piece types the player has
  const playerTypes = new Set(classDef.startingPlayerPieces.map(sp => sp.type));
  // Upgrades already applied
  const upgradedTypes = new Set(existingUpgrades.map(u => u.pieceType));

  // Prefer upgrades for piece types the player hasn't upgraded yet
  const eligible = UPGRADE_DEFINITIONS.filter(u => playerTypes.has(u.pieceType));
  const preferred = eligible.filter(u => !upgradedTypes.has(u.pieceType));
  const fallback  = eligible.filter(u => upgradedTypes.has(u.pieceType));

  const pool = preferred.length >= count
    ? preferred
    : [...preferred, ...fallback];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ─── Upgrade Card ─────────────────────────────────────────────────────────────

function UpgradeCard({
  upgrade,
  alreadyHas,
  onPick,
}: {
  upgrade: UpgradeDefinition;
  alreadyHas: boolean;
  onPick: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, alreadyHas && styles.cardDim]}
      onPress={onPick}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.upgradeEmoji}>{upgrade.emoji}</Text>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.upgradeName}>{upgrade.name}</Text>
          <View style={styles.pieceTypeBadge}>
            <Text style={styles.pieceTypeEmoji}>{PIECE_EMOJI[upgrade.pieceType]}</Text>
            <Text style={styles.pieceTypeLabel}>{upgrade.pieceType}</Text>
          </View>
        </View>
        {alreadyHas && (
          <View style={styles.replaceBadge}>
            <Text style={styles.replaceBadgeText}>REPLACE</Text>
          </View>
        )}
      </View>

      <Text style={styles.upgradeDesc}>{upgrade.description}</Text>

      <View style={styles.pickBtn}>
        <Text style={styles.pickBtnText}>
          {alreadyHas ? 'Replace Upgrade' : 'Apply Upgrade'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ finalHp?: string }>();
  const { runState, dispatch } = useRun();

  // All hooks must be declared before early returns
  const classDef = runState
    ? (CLASS_DEFINITIONS.find(c => c.id === runState.playerClass) ?? CLASS_DEFINITIONS[0])
    : CLASS_DEFINITIONS[0];

  const upgradeOptions = useMemo(
    () => runState
      ? pickUpgradeOptions(classDef, runState.pieceUpgrades, 3)
      : [],
    [],
  );

  if (!runState) {
    router.replace('/');
    return null;
  }

  const finalHp = parseInt(params.finalHp ?? String(runState.hp), 10);

  function handlePick(upgrade: UpgradeDefinition) {
    dispatch({
      type: 'APPLY_UPGRADE',
      pieceType: upgrade.pieceType,
      upgrade: upgrade.id,
    });
    router.replace('/map-screen');
  }

  function handleSkip() {
    router.replace('/map-screen');
  }

  const upgradedTypes = runState.pieceUpgrades.map(u => u.pieceType);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⬆ Piece Upgrade</Text>
        <Text style={styles.headerSub}>
          Choose an upgrade to enhance a piece for the rest of the run
        </Text>
      </View>

      {/* Upgrade options */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {upgradeOptions.length === 0 ? (
          <View style={styles.noUpgrades}>
            <Text style={styles.noUpgradesText}>
              All available upgrades have been applied!
            </Text>
          </View>
        ) : (
          upgradeOptions.map(upgrade => (
            <React.Fragment key={upgrade.id}>
              <UpgradeCard
                upgrade={upgrade}
                alreadyHas={upgradedTypes.includes(upgrade.pieceType)}
                onPick={() => handlePick(upgrade)}
              />
            </React.Fragment>
          ))
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip — No Upgrade</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 6,
  },
  headerTitle: {
    color: '#7a7aff',
    fontSize: 26,
    fontWeight: '900',
  },
  headerSub: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Upgrade card
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 10,
  },
  cardDim: {
    borderColor: '#444',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeEmoji: {
    fontSize: 34,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  upgradeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  pieceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pieceTypeEmoji: {
    fontSize: 14,
  },
  pieceTypeLabel: {
    color: '#7a7aff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  replaceBadge: {
    backgroundColor: '#3a2a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  replaceBadgeText: {
    color: '#FFA500',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  upgradeDesc: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 19,
  },
  pickBtn: {
    backgroundColor: '#7a7aff',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pickBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  noUpgrades: {
    alignItems: 'center',
    padding: 32,
  },
  noUpgradesText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
  },

  skipBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  skipBtnText: {
    color: '#555',
    fontSize: 14,
  },
});
