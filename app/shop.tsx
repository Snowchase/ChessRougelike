/**
 * shop.tsx — Shop Screen
 *
 * Players spend gold on:
 *   - Cards  (common 20g, uncommon 35g, rare 50g)
 *   - Relics (75g each)
 *   - Piece Upgrades (50g)
 *
 * Purchased items are removed from the shop and added to the run state.
 * When done, the player returns to the map.
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
import { generateShopInventory, ShopItem } from '@/src/engine/run';

// ─── Rarity colours ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:   '#888',
  uncommon: '#4caf50',
  rare:     '#9c27b0',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter();
  const { run, dispatch } = useRun();

  const inventory = useMemo(
    () => (run ? generateShopInventory(run.playerPieces) : []),
    [],
  );

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  if (!run) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.centerText}>No active run.</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/')}>
            <Text style={styles.navBtnText}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBuy = (item: ShopItem) => {
    if (run.gold < item.cost) return;
    if (purchasedIds.has(item.id)) return;

    dispatch({ type: 'SPEND_GOLD', amount: item.cost });

    if (item.kind === 'card' && item.card) {
      dispatch({
        type: 'ADD_CARD',
        card: { ...item.card, id: `shop_${item.card.id}_${Date.now()}` },
      });
    } else if (item.kind === 'relic' && item.relicId) {
      dispatch({ type: 'ADD_RELIC', relicId: item.relicId });
    } else if (item.kind === 'upgrade' && item.upgradeOption) {
      const opt = item.upgradeOption;
      const piece = run.playerPieces.find(
        p => p.type === opt.targetType && !p.upgrades.includes(opt.upgrade),
      );
      if (piece) {
        dispatch({ type: 'UPGRADE_PIECE', pieceId: piece.id, upgrade: opt.upgrade });
      }
    }

    setPurchasedIds(prev => new Set(prev).add(item.id));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/map')}>
          <Text style={styles.backBtnText}>← Map</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛒 Shop</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>💰 {run.gold}g</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {inventory.map(item => {
          const purchased = purchasedIds.has(item.id);
          const canAfford = run.gold >= item.cost && !purchased;

          return (
            <ShopItemRow
              key={item.id}
              item={item}
              purchased={purchased}
              canAfford={canAfford}
              onBuy={() => handleBuy(item)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.leaveBtn} onPress={() => router.replace('/map')}>
          <Text style={styles.leaveBtnText}>Leave Shop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── ShopItemRow ──────────────────────────────────────────────────────────────

function ShopItemRow({
  item,
  purchased,
  canAfford,
  onBuy,
}: {
  item: ShopItem;
  purchased: boolean;
  canAfford: boolean;
  onBuy: () => void;
}) {
  let borderColor = '#333';
  let title = '';
  let subtitle = '';
  let body = '';

  if (item.kind === 'card' && item.card) {
    borderColor = RARITY_COLOR[item.card.rarity] ?? '#888';
    title    = item.card.name;
    subtitle = `${item.card.rarity} · ${item.card.pieceType}`;
    body     = item.card.description;
  } else if (item.kind === 'relic') {
    borderColor = '#f39c12';
    title    = item.relicName ?? 'Relic';
    subtitle = 'Relic';
    body     = item.relicDescription ?? '';
  } else if (item.kind === 'upgrade' && item.upgradeOption) {
    borderColor = '#4a7fcb';
    title    = item.upgradeOption.name;
    subtitle = `Upgrades ${item.upgradeOption.targetType}`;
    body     = item.upgradeOption.description;
  }

  return (
    <View style={[styles.itemRow, { borderColor }, purchased && styles.itemRowPurchased]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.itemTitle, { color: purchased ? '#555' : borderColor }]}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
        <Text style={styles.itemBody}>{body}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.buyBtn,
          !canAfford && styles.buyBtnDisabled,
          purchased && styles.buyBtnPurchased,
        ]}
        onPress={onBuy}
        disabled={!canAfford}
      >
        <Text style={[
          styles.buyBtnText,
          !canAfford && styles.buyBtnTextDisabled,
          purchased && styles.buyBtnTextPurchased,
        ]}>
          {purchased ? '✓ Bought' : `${item.cost}g`}
        </Text>
      </TouchableOpacity>
    </View>
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
    fontSize: 20,
    fontWeight: '800',
  },
  goldBadge: {
    backgroundColor: '#1a1a0a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  goldText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162a',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  itemRowPurchased: {
    opacity: 0.5,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemBody: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  buyBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#333',
  },
  buyBtnPurchased: {
    backgroundColor: '#1a3a1a',
  },
  buyBtnText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
  },
  buyBtnTextDisabled: {
    color: '#666',
  },
  buyBtnTextPurchased: {
    color: '#4caf50',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  leaveBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  leaveBtnText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  navBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  navBtnText: {
    color: '#ccc',
    fontSize: 16,
  },
});
