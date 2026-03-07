/**
 * reward.tsx — Post-Battle Reward Screen
 *
 * After winning a battle the player:
 *   Step 1: Picks 1 of 3 cards to add to their deck (or skips for 10 gold).
 *   Step 2: Picks 1 of 3 piece upgrades (or skips).
 *
 * After both steps the player returns to the map.
 */

import React, { useState, useMemo } from 'react';
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
import { getDraftPool, getUpgradeOptions, UpgradeOption } from '@/src/engine/run';
import { MoveCard } from '@/src/engine/types';

// ─── Rarity colours ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:   '#888',
  uncommon: '#4caf50',
  rare:     '#9c27b0',
};

// ─── Component ────────────────────────────────────────────────────────────────

type RewardStep = 'card_draft' | 'upgrade_pick' | 'done';

export default function RewardScreen() {
  const router = useRouter();
  const { run, dispatch } = useRun();

  const [step, setStep] = useState<RewardStep>('card_draft');

  // Generate the pools once on mount (useMemo with empty deps)
  const cardPool    = useMemo(() => getDraftPool(3), []);
  const upgradePool = useMemo(
    () => (run ? getUpgradeOptions(run.playerPieces, 3) : []),
    [],
  );

  if (!run) {
    // No active run — shouldn't happen but handle gracefully
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.centerText}>No active run.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')}>
            <Text style={styles.btnText}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const proceed = () => {
    if (step === 'card_draft') {
      if (upgradePool.length > 0) {
        setStep('upgrade_pick');
      } else {
        setStep('done');
        router.replace('/map');
      }
    } else if (step === 'upgrade_pick') {
      setStep('done');
      router.replace('/map');
    }
  };

  const handlePickCard = (card: MoveCard) => {
    dispatch({ type: 'ADD_CARD', card: { ...card, id: `deck_${card.id}_${Date.now()}` } });
    proceed();
  };

  const handleSkipCard = () => {
    // Skipping the card draft grants 10 bonus gold as compensation.
    // SPEND_GOLD with a negative amount adds gold: max(0, gold - (-10)) = gold + 10.
    dispatch({ type: 'SPEND_GOLD', amount: -10 });
    proceed();
  };

  const handlePickUpgrade = (opt: UpgradeOption) => {
    // Find the first unupgraded piece of the matching type
    const piece = run.playerPieces.find(
      p => p.type === opt.targetType && !p.upgrades.includes(opt.upgrade),
    );
    if (piece) {
      dispatch({ type: 'UPGRADE_PIECE', pieceId: piece.id, upgrade: opt.upgrade });
    }
    setStep('done');
    router.replace('/map');
  };

  const handleSkipUpgrade = () => {
    setStep('done');
    router.replace('/map');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {step === 'card_draft' ? '⚔ Victory! — Choose a Card' : '⬆ Upgrade a Piece'}
        </Text>
        <Text style={styles.headerSub}>
          {step === 'card_draft'
            ? 'Pick one card to add to your deck.'
            : 'Choose an upgrade for one of your pieces.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'card_draft' && (
          <>
            {cardPool.map(card => (
              <CardOption key={card.id} card={card} onPick={() => handlePickCard(card)} />
            ))}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipCard}>
              <Text style={styles.skipBtnText}>Skip — Take 10 Gold instead</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'upgrade_pick' && (
          <>
            {upgradePool.map(opt => (
              <UpgradeOption key={opt.upgrade} opt={opt} onPick={() => handlePickUpgrade(opt)} />
            ))}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipUpgrade}>
              <Text style={styles.skipBtnText}>Skip Upgrade</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Run snapshot */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          HP: {run.playerHp}/{run.maxPlayerHp}  ·  Gold: {run.gold}  ·  Deck: {run.deck.length} cards
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Card option card ─────────────────────────────────────────────────────────

function CardOption({ card, onPick }: { card: MoveCard; onPick: () => void }) {
  const color = RARITY_COLOR[card.rarity] ?? '#888';
  return (
    <TouchableOpacity style={[styles.optionCard, { borderColor: color }]} onPress={onPick} activeOpacity={0.8}>
      <View style={styles.optionCardHeader}>
        <View style={[styles.pieceBadge, { borderColor: color }]}>
          <Text style={[styles.pieceBadgeText, { color }]}>{card.pieceType.slice(0, 2)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color }]}>{card.name}</Text>
          <Text style={styles.cardRarity}>{card.rarity}</Text>
        </View>
        <Text style={styles.cardDmg}>⚔ {card.baseDamage}</Text>
        {card.hpCost && <Text style={styles.cardHp}>❤ -{card.hpCost}</Text>}
      </View>
      <Text style={styles.cardDesc}>{card.description}</Text>
    </TouchableOpacity>
  );
}

// ─── Upgrade option card ──────────────────────────────────────────────────────

function UpgradeOption({ opt, onPick }: { opt: UpgradeOption; onPick: () => void }) {
  return (
    <TouchableOpacity style={[styles.optionCard, { borderColor: '#f39c12' }]} onPress={onPick} activeOpacity={0.8}>
      <Text style={styles.upgradeName}>{opt.name}</Text>
      <Text style={styles.upgradeTarget}>Upgrades: {opt.targetType}</Text>
      <Text style={styles.upgradeDesc}>{opt.description}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d18',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  centerText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 6,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#888',
    fontSize: 14,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  optionCard: {
    backgroundColor: '#16162a',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pieceBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pieceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardRarity: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  cardDmg: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '700',
  },
  cardHp: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  upgradeName: {
    color: '#f39c12',
    fontSize: 18,
    fontWeight: '800',
  },
  upgradeTarget: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  upgradeDesc: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  skipBtnText: {
    color: '#666',
    fontSize: 14,
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
  btn: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#ccc',
    fontSize: 16,
  },
});
