/**
 * CardHand.tsx — Displays the player's hand of Move Cards
 *
 * Shows 3–5 cards horizontally. Tapping a card selects it.
 * Selected card is highlighted. Cards that don't match available
 * pieces are shown dimmed.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { MoveCard, BattleState, PieceType, CardEffect } from '@/src/engine/types';

// ─── Ability card labels & colours ───────────────────────────────────────────

const ABILITY_EFFECTS = new Set<CardEffect>([
  'PUSH', 'PULL', 'TELEPORT', 'SWAP_ALLY', 'REPULSE',
]);

const ABILITY_LABEL: Partial<Record<CardEffect, string>> = {
  PUSH:      '↗ Push',
  PULL:      '↙ Pull',
  TELEPORT:  '✦ Blink',
  SWAP_ALLY: '⇄ Swap',
  REPULSE:   '❋ Burst',
};

// ─── Piece colours & labels ───────────────────────────────────────────────────

const PIECE_COLOR: Record<PieceType, string> = {
  ROGUE:    '#4CAF50',
  BRAWLER:  '#2196F3',
  RANGER:   '#9C27B0',
  GUARDIAN: '#FF9800',
  WITCH:    '#E91E63',
  HERO:     '#FFD700',
};

/** Short badge label for each piece type (unique, max 2 chars). */
const PIECE_BADGE: Record<PieceType, string> = {
  ROGUE:    'Rg',
  BRAWLER:  'Bw',
  RANGER:   'Rn',
  GUARDIAN: 'Gu',
  WITCH:    'Wt',
  HERO:     'Hr',
};

const RARITY_BORDER: Record<string, string> = {
  common:   '#888',
  uncommon: '#4CAF50',
  rare:     '#9C27B0',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardHandProps {
  state: BattleState;
  onCardSelect: (cardId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CardHand({ state, onCardSelect }: CardHandProps) {
  const { playerHand, selectedCardId, phase, pieces } = state;

  // Which piece types exist on the player's side?
  const playerPieceTypes = new Set(
    pieces.filter(p => p.team === 'player').map(p => p.type),
  );

  const canSelect = phase === 'player_select_card' || phase === 'player_select_piece';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hand ({playerHand.length})</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.handRow}
      >
        {playerHand.map(card => {
          const isSelected = card.id === selectedCardId;
          const hasMatchingPiece = playerPieceTypes.has(card.pieceType);
          const isPlayable = canSelect && hasMatchingPiece;

          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.card,
                { borderColor: RARITY_BORDER[card.rarity] ?? '#888' },
                isSelected && styles.selectedCard,
                !isPlayable && styles.dimmedCard,
              ]}
              onPress={() => isPlayable && onCardSelect(card.id)}
              activeOpacity={isPlayable ? 0.7 : 1}
            >
              {/* Piece type badge */}
              <View style={[styles.badge, { backgroundColor: PIECE_COLOR[card.pieceType] ?? '#555' }]}>
                <Text style={styles.badgeText}>{PIECE_BADGE[card.pieceType] ?? '??'}</Text>
              </View>

              {/* Card name */}
              <Text style={styles.cardName} numberOfLines={2}>{card.name}</Text>

              {/* Damage or ability tag */}
              {ABILITY_EFFECTS.has(card.effect) ? (
                <Text style={styles.abilityTag}>
                  {ABILITY_LABEL[card.effect] ?? card.effect}
                </Text>
              ) : (
                <Text style={styles.damage}>⚔ {card.baseDamage}</Text>
              )}

              {/* HP cost if any */}
              {card.hpCost ? (
                <Text style={styles.hpCost}>❤ -{card.hpCost}</Text>
              ) : null}

              {/* Description */}
              <Text style={styles.desc} numberOfLines={2}>{card.description}</Text>
            </TouchableOpacity>
          );
        })}

        {playerHand.length === 0 && (
          <Text style={styles.emptyText}>No cards in hand.</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  card: {
    width: 100,
    minHeight: 130,
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    borderWidth: 2,
    padding: 8,
    gap: 4,
  },
  selectedCard: {
    backgroundColor: '#3a3a5a',
    borderColor: '#FFD700',
    transform: [{ translateY: -4 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  dimmedCard: {
    opacity: 0.45,
  },
  badge: {
    width: 26,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cardName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  damage: {
    color: '#FF9999',
    fontSize: 12,
    fontWeight: '600',
  },
  abilityTag: {
    color: '#7EC8E3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hpCost: {
    color: '#FF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  desc: {
    color: '#aaa',
    fontSize: 10,
    lineHeight: 13,
    flexShrink: 1,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    alignSelf: 'center',
    marginTop: 8,
  },
});
