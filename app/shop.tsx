/**
 * shop.tsx — Shop Screen
 *
 * The player spends gold to buy:
 *   - Move Cards (common 50g, uncommon 75g, rare 120g)
 *   - Relics   (100–150g)
 *   - Healing  (30g per 5 HP)
 *
 * Flow: MapScreen → ShopScreen → MapScreen
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
import { useRouter } from 'expo-router';

import { useRun } from '@/src/context/RunContext';
import { ALL_CARDS } from '@/src/engine/cards';
import { RELIC_DEFINITIONS } from '@/src/engine/relics';
import { MoveCard } from '@/src/engine/types';

// ─── Pricing ──────────────────────────────────────────────────────────────────

const CARD_PRICE: Record<string, number> = {
  common:   50,
  uncommon: 75,
  rare:     120,
};

const RELIC_PRICE = 120;
const HEAL_PRICE  = 30;
const HEAL_AMOUNT = 5;

// ─── Rarity colours ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:   '#888',
  uncommon: '#2ecc71',
  rare:     '#9b59b6',
};

// ─── Piece emoji ──────────────────────────────────────────────────────────────

const PIECE_EMOJI: Record<string, string> = {
  KING: '♚', QUEEN: '♛', ROOK: '♜', BISHOP: '♝', KNIGHT: '♞', PAWN: '♟',
};

// ─── Shop item generators ─────────────────────────────────────────────────────

function pickShopCards(count: number): MoveCard[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickShopRelics(count: number, ownedIds: string[]) {
  const available = RELIC_DEFINITIONS.filter(r => !ownedIds.includes(r.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// ─── Shop card row ────────────────────────────────────────────────────────────

function ShopCard({
  card,
  price,
  canAfford,
  purchased,
  onBuy,
}: {
  card: MoveCard;
  price: number;
  canAfford: boolean;
  purchased: boolean;
  onBuy: () => void;
}) {
  const rarityColor = RARITY_COLOR[card.rarity] ?? '#888';

  return (
    <View style={[styles.shopRow, purchased && styles.shopRowPurchased]}>
      <Text style={styles.shopPieceEmoji}>{PIECE_EMOJI[card.pieceType]}</Text>
      <View style={styles.shopItemInfo}>
        <Text style={styles.shopItemName}>{card.name}</Text>
        <Text style={[styles.shopItemRarity, { color: rarityColor }]}>
          {card.rarity.toUpperCase()} · {card.pieceType}
        </Text>
        <Text style={styles.shopItemDesc} numberOfLines={2}>{card.description}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.buyBtn,
          !canAfford && styles.buyBtnDisabled,
          purchased && styles.buyBtnPurchased,
        ]}
        onPress={onBuy}
        disabled={!canAfford || purchased}
      >
        <Text style={styles.buyBtnText}>
          {purchased ? '✓' : `${price}g`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter();
  const { runState, dispatch } = useRun();

  // All hooks must be called before any early returns
  const [purchasedCardIds, setPurchasedCardIds] = React.useState<string[]>([]);
  const [purchasedRelicIds, setPurchasedRelicIds] = React.useState<string[]>([]);
  const shopCards  = useMemo(() => pickShopCards(3), []);
  const shopRelics = useMemo(() => pickShopRelics(2, runState?.relicIds ?? []), []);

  if (!runState) {
    router.replace('/');
    return null;
  }

  const { gold, hp, maxHp } = runState;

  function buyCard(card: MoveCard) {
    const price = CARD_PRICE[card.rarity] ?? 50;
    dispatch({ type: 'BUY_CARD', card: { ...card, id: `${card.id}_shop_${Date.now()}` }, cost: price });
    setPurchasedCardIds(prev => [...prev, card.id]);
  }

  function buyRelic(relicId: string) {
    dispatch({ type: 'BUY_RELIC', relicId, cost: RELIC_PRICE });
    setPurchasedRelicIds(prev => [...prev, relicId]);
  }

  function buyHeal() {
    if (gold < HEAL_PRICE || hp >= maxHp) return;
    dispatch({ type: 'HEAL', amount: HEAL_AMOUNT, cost: HEAL_PRICE });
  }

  function handleLeave() {
    dispatch({ type: 'COMPLETE_NODE', finalHp: hp, goldEarned: 0 });
    router.replace('/map-screen');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Shop</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>💰 {runState.gold} gold</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Move Cards ─────────────────────────────────────────────────── */}
        <SectionHeader title="Move Cards" />
        {shopCards.map(card => {
          const price = CARD_PRICE[card.rarity] ?? 50;
          return (
            <React.Fragment key={card.id}>
              <ShopCard
                card={card}
                price={price}
                canAfford={runState.gold >= price}
                purchased={purchasedCardIds.includes(card.id)}
                onBuy={() => buyCard(card)}
              />
            </React.Fragment>
          );
        })}

        {/* ── Relics ─────────────────────────────────────────────────────── */}
        <SectionHeader title="Relics" />
        {shopRelics.length === 0 ? (
          <Text style={styles.emptyText}>You own all available relics.</Text>
        ) : (
          shopRelics.map(relic => {
            const purchased = purchasedRelicIds.includes(relic.id) || runState.relicIds.includes(relic.id);
            return (
              <View key={relic.id} style={[styles.shopRow, purchased && styles.shopRowPurchased]}>
                <View style={styles.shopItemInfo}>
                  <Text style={styles.shopItemName}>{relic.name}</Text>
                  <Text style={styles.shopItemDesc}>{relic.description}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.buyBtn,
                    runState.gold < RELIC_PRICE && styles.buyBtnDisabled,
                    purchased && styles.buyBtnPurchased,
                  ]}
                  onPress={() => buyRelic(relic.id)}
                  disabled={runState.gold < RELIC_PRICE || purchased}
                >
                  <Text style={styles.buyBtnText}>
                    {purchased ? '✓' : `${RELIC_PRICE}g`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ── Healing ────────────────────────────────────────────────────── */}
        <SectionHeader title="Services" />
        <View style={styles.shopRow}>
          <Text style={styles.shopPieceEmoji}>💊</Text>
          <View style={styles.shopItemInfo}>
            <Text style={styles.shopItemName}>Heal</Text>
            <Text style={styles.shopItemDesc}>
              Restore {HEAL_AMOUNT} HP. Current: {runState.hp}/{runState.maxHp}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.buyBtn,
              (runState.gold < HEAL_PRICE || runState.hp >= runState.maxHp) && styles.buyBtnDisabled,
            ]}
            onPress={buyHeal}
            disabled={runState.gold < HEAL_PRICE || runState.hp >= runState.maxHp}
          >
            <Text style={styles.buyBtnText}>{HEAL_PRICE}g</Text>
          </TouchableOpacity>
        </View>

        {/* Leave */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Text style={styles.leaveBtnText}>Leave Shop →</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
  },
  goldBadge: {
    backgroundColor: '#2a2010',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  goldText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 8,
  },

  // Section header
  sectionHeader: {
    marginTop: 8,
    marginBottom: 2,
  },
  sectionHeaderText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Shop row
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  shopRowPurchased: {
    opacity: 0.5,
  },
  shopPieceEmoji: {
    fontSize: 26,
  },
  shopItemInfo: {
    flex: 1,
    gap: 3,
  },
  shopItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  shopItemRarity: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shopItemDesc: {
    color: '#777',
    fontSize: 12,
    lineHeight: 16,
  },

  // Buy button
  buyBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 54,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#333',
  },
  buyBtnPurchased: {
    backgroundColor: '#1a4a1a',
  },
  buyBtnText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyText: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },

  leaveBtn: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  leaveBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '700',
  },
});
