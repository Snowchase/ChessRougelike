/**
 * event.tsx — Mystery Event Screen
 *
 * Shows a randomly-selected (but deterministic per node) event with 3 choices.
 * Each choice applies an effect to the run state, then navigates back to the map.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useRun } from '@/src/context/RunContext';
import { EventDef, EventChoice, EventEffect, pickEventForNode } from '@/src/engine/events_data';
import { ALL_CARDS } from '@/src/engine/cards';

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventScreen() {
  const router = useRouter();
  const { run, dispatch } = useRun();

  // Pick event deterministically from the current node ID
  const [event] = useState<EventDef>(() => {
    const nodeId = run?.currentNodeId ?? 'default';
    return pickEventForNode(nodeId);
  });

  const [resolved, setResolved] = useState(false);
  const [resultText, setResultText] = useState('');

  if (!run) {
    router.replace('/map');
    return null;
  }

  const applyEffect = (effect: EventEffect): string => {
    switch (effect.type) {
      case 'HEAL':
        dispatch({ type: 'HEAL', amount: effect.amount });
        return `Restored ${effect.amount} HP.`;

      case 'ADD_CARD': {
        const template = ALL_CARDS.find(c => c.id === effect.cardId);
        if (!template) return 'Nothing happened.';
        const card = { ...template, id: `${template.id}_ev${Date.now()}` };
        dispatch({ type: 'ADD_CARD', card });
        return `${template.name} added to your deck.`;
      }

      case 'ADD_RELIC':
        dispatch({ type: 'ADD_RELIC', relicId: effect.relicId });
        return 'A new relic joins your collection.';

      case 'GAIN_GOLD':
        dispatch({ type: 'GAIN_GOLD', amount: effect.amount });
        return `Gained ${effect.amount} gold.`;

      case 'SPEND_GOLD_GAIN_RELIC':
        dispatch({ type: 'SPEND_GOLD', amount: effect.cost });
        dispatch({ type: 'ADD_RELIC', relicId: effect.relicId });
        return `Spent ${effect.cost} gold. A new relic joins your collection.`;

      case 'SPEND_GOLD_GAIN_CARD': {
        const template = ALL_CARDS.find(c => c.id === effect.cardId);
        if (!template) return 'Nothing happened.';
        dispatch({ type: 'SPEND_GOLD', amount: effect.cost });
        const card = { ...template, id: `${template.id}_ev${Date.now()}` };
        dispatch({ type: 'ADD_CARD', card });
        return `Spent ${effect.cost} gold. ${template.name} added to your deck.`;
      }

      case 'NOTHING':
        return 'You move on, unbothered.';
    }
  };

  const isChoiceDisabled = (effect: EventEffect): boolean => {
    if (effect.type === 'SPEND_GOLD_GAIN_RELIC') return run.gold < effect.cost;
    if (effect.type === 'SPEND_GOLD_GAIN_CARD') return run.gold < effect.cost;
    return false;
  };

  const handleChoice = (choice: EventChoice) => {
    if (resolved) return;
    const result = applyEffect(choice.effect);
    setResultText(result);
    setResolved(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0918" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eventTag}>❓ MYSTERY EVENT</Text>
          <View style={styles.statsChip}>
            <Text style={styles.statText}>❤ {run.playerHp}/{run.maxPlayerHp}</Text>
            <Text style={styles.statText}>💰 {run.gold}</Text>
          </View>
        </View>

        {/* Event card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.cardFlavor}>{event.flavor}</Text>
        </View>

        {/* Choices or result */}
        {!resolved ? (
          <View style={styles.choices}>
            <Text style={styles.choicesHeader}>What do you do?</Text>
            {event.choices.map((choice, i) => {
              const disabled = isChoiceDisabled(choice.effect);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.choiceBtn, disabled && styles.choiceBtnDisabled]}
                  onPress={() => handleChoice(choice)}
                  disabled={disabled}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.choiceLabel, disabled && styles.choiceLabelDisabled]}>
                    {choice.label}
                  </Text>
                  <Text style={[styles.choiceDesc, disabled && styles.choiceDescDisabled]}>
                    {choice.description}
                  </Text>
                  {disabled && (
                    <Text style={styles.choiceInsufficient}>Not enough gold</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.result}>
            <Text style={styles.resultIcon}>✓</Text>
            <Text style={styles.resultText}>{resultText}</Text>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.replace('/map')}
            >
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d0918',
  },
  container: {
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTag: {
    color: '#a855f7',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsChip: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1a0d28',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6b21a8',
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    color: '#e2b3ff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardFlavor: {
    color: '#b897d4',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  choices: {
    gap: 12,
  },
  choicesHeader: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  choiceBtn: {
    backgroundColor: '#1e1030',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a2068',
    padding: 16,
    gap: 4,
  },
  choiceBtnDisabled: {
    backgroundColor: '#141020',
    borderColor: '#2a1a38',
    opacity: 0.6,
  },
  choiceLabel: {
    color: '#e2b3ff',
    fontSize: 15,
    fontWeight: '700',
  },
  choiceLabelDisabled: {
    color: '#664488',
  },
  choiceDesc: {
    color: '#9966bb',
    fontSize: 12,
    lineHeight: 18,
  },
  choiceDescDisabled: {
    color: '#443355',
  },
  choiceInsufficient: {
    color: '#cc4444',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  result: {
    backgroundColor: '#0d1a10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d6a38',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  resultIcon: {
    fontSize: 32,
    color: '#4ade80',
  },
  resultText: {
    color: '#86efac',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
