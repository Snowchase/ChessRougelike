/**
 * reward.tsx — Post-Battle Card Reward
 *
 * After winning a battle the player drafts one card from a choice of three.
 * Gold earned is passed via route params.
 *
 * Flow: BattleScreen (victory) → RewardScreen → UpgradeScreen → MapScreen
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

import { ALL_CARDS } from '@/src/engine/cards';
import { MoveCard } from '@/src/engine/types';
import { useRun } from '@/src/context/RunContext';

// ─── Rarity colours ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:   '#888',
  uncommon: '#2ecc71',
  rare:     '#9b59b6',
};

const RARITY_LABEL: Record<string, string> = {
  common:   'COMMON',
  uncommon: 'UNCOMMON',
  rare:     'RARE',
};

// ─── Piece type emoji ─────────────────────────────────────────────────────────

const PIECE_EMOJI: Record<string, string> = {
  KING: '♚', QUEEN: '♛', ROOK: '♜', BISHOP: '♝', KNIGHT: '♞', PAWN: '♟',
};

// ─── Shuffle helper ───────────────────────────────────────────────────────────

function pickRandomCards(count: number, exclude: Set<string>): MoveCard[] {
  const pool = ALL_CARDS.filter(c => !exclude.has(c.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Card Option ──────────────────────────────────────────────────────────────

function CardOption({
  card,
  onPick,
}: {
  card: MoveCard;
  onPick: () => void;
}) {
  const rarityColor = RARITY_COLOR[card.rarity] ?? '#888';

  return (
    <TouchableOpacity style={styles.cardOption} onPress={onPick} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardPieceEmoji}>{PIECE_EMOJI[card.pieceType]}</Text>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={[styles.cardRarity, { color: rarityColor }]}>
            {RARITY_LABEL[card.rarity]}
          </Text>
        </View>
        {card.baseDamage > 0 && (
          <View style={styles.dmgBadge}>
            <Text style={styles.dmgText}>{card.baseDamage}⚔</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardDesc}>{card.description}</Text>
      {card.hpCost && (
        <Text style={styles.hpCost}>Costs {card.hpCost} HP</Text>
      )}
      <View style={styles.pickBtn}>
        <Text style={styles.pickBtnText}>Add to Deck</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RewardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goldEarned?: string; finalHp?: string }>();
  const { runState, dispatch } = useRun();

  const goldEarned = parseInt(params.goldEarned ?? '0', 10);
  const finalHp    = parseInt(params.finalHp   ?? String(runState?.hp ?? 20), 10);

  // Generate 3 card options once on mount
  const existingCardIds = useMemo(() => {
    const ids = new Set<string>();
    if (runState) {
      for (const c of runState.deck) {
        ids.add(c.pieceType + ':' + c.name); // avoid structural duplicates
      }
    }
    return ids;
  }, []);

  const cardOptions = useMemo(() => pickRandomCards(3, new Set<string>()), []);

  function handlePick(card: MoveCard) {
    dispatch({
      type: 'ADD_CARD',
      card: { ...card, id: `${card.id}_r${Date.now()}` },
    });
    router.replace(`/upgrade?fromReward=1&finalHp=${finalHp}`);
  }

  function handleSkip() {
    router.replace(`/upgrade?fromReward=1&finalHp=${finalHp}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚔ Victory!</Text>
        {goldEarned > 0 && (
          <Text style={styles.goldEarned}>+{goldEarned} 💰 gold earned</Text>
        )}
        <Text style={styles.headerSub}>Choose a card to add to your deck</Text>
      </View>

      {/* Card options */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cardOptions.map(card => (
          <React.Fragment key={card.id}>
            <CardOption card={card} onPick={() => handlePick(card)} />
          </React.Fragment>
        ))}

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip — No Thanks</Text>
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
    paddingVertical: 20,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 4,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
  },
  goldEarned: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Card option
  cardOption: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardPieceEmoji: {
    fontSize: 28,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  cardRarity: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  dmgBadge: {
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dmgText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '800',
  },
  cardDesc: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
  },
  hpCost: {
    color: '#e74c3c',
    fontSize: 12,
    fontStyle: 'italic',
  },
  pickBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pickBtnText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '800',
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
