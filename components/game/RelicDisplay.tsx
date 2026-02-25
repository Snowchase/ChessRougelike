/**
 * RelicDisplay.tsx — Shows active relics with name and description
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { RelicInstance } from '@/src/engine/types';
import { RELIC_DEFINITIONS } from '@/src/engine/relics';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RelicDisplayProps {
  relics: RelicInstance[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RelicDisplay({ relics }: RelicDisplayProps) {
  if (relics.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relics</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {relics.map(instance => {
            const def = RELIC_DEFINITIONS.find(r => r.id === instance.relicId);
            if (!def) return null;

            const rarityColor =
              def.rarity === 'rare' ? '#9C27B0' :
              def.rarity === 'uncommon' ? '#4CAF50' :
              '#888';

            return (
              <View key={instance.relicId} style={[styles.relic, { borderColor: rarityColor }]}>
                <Text style={styles.relicName}>{def.name}</Text>
                {instance.counter > 0 && (
                  <Text style={styles.counter}>{instance.counter}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  relic: {
    backgroundColor: '#1e1e2e',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relicName: {
    color: '#e0d7ff',
    fontSize: 11,
    fontWeight: '600',
  },
  counter: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
