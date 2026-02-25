/**
 * index.tsx — Main Menu
 *
 * Entry point for the game. Presents the title and a "New Run" button
 * that navigates to the BattleScreen.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function MainMenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleSymbol}>♟</Text>
          <Text style={styles.title}>Chess Roguelike</Text>
          <Text style={styles.subtitle}>
            Balatro synergies · Peglin combos · Slay the Spire runs
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/battle')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>⚔ New Run</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Text style={styles.secondaryBtnText}>📜 Run History</Text>
          </TouchableOpacity>
        </View>

        {/* Phase 1 info */}
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Phase 1 — Core Engine</Text>
          <Text style={styles.versionSubtext}>One playable battle end-to-end</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>How to play</Text>
          <Text style={styles.legendItem}>1. Select a card from your hand.</Text>
          <Text style={styles.legendItem}>2. Tap one of your matching pieces.</Text>
          <Text style={styles.legendItem}>3. Tap a highlighted square to move.</Text>
          <Text style={styles.legendItem}>4. Chain captures to build your combo!</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0d18',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 8,
  },
  titleSymbol: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#777',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#111',
    fontSize: 20,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#888',
    fontSize: 16,
  },
  versionBadge: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  versionText: {
    color: '#7a7aff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  versionSubtext: {
    color: '#555',
    fontSize: 11,
  },
  legend: {
    width: '100%',
    gap: 6,
  },
  legendTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendItem: {
    color: '#666',
    fontSize: 13,
    lineHeight: 19,
  },
});
