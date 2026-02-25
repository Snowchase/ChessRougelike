/**
 * BoardRenderer.tsx — 8×8 chess board with piece placement and square highlighting
 *
 * Square colors:
 *   Light squares:  #F0D9B5
 *   Dark squares:   #B58863
 *   Move highlight: semi-transparent green dot
 *   Capture square: semi-transparent red overlay
 *   Selected piece: yellow border
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { Piece, Position, BattleState } from '@/src/engine/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.floor((SCREEN_WIDTH - 8) / 8) * 8; // fit 8 cells exactly
const CELL = BOARD_SIZE / 8;

const LIGHT_SQ = '#F0D9B5';
const DARK_SQ  = '#B58863';

const PIECE_SYMBOL: Record<string, string> = {
  player_PAWN:   '♙',
  player_KNIGHT: '♘',
  player_BISHOP: '♗',
  player_ROOK:   '♖',
  player_QUEEN:  '♕',
  player_KING:   '♔',
  enemy_PAWN:    '♟',
  enemy_KNIGHT:  '♞',
  enemy_BISHOP:  '♝',
  enemy_ROOK:    '♜',
  enemy_QUEEN:   '♛',
  enemy_KING:    '♚',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoardRendererProps {
  state: BattleState;
  onSquarePress: (position: Position) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

function buildSquareMap(pieces: Piece[]): Map<string, Piece> {
  const map = new Map<string, Piece>();
  for (const p of pieces) {
    map.set(posKey(p.position), p);
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardRenderer({ state, onSquarePress }: BoardRendererProps) {
  const {
    pieces,
    selectedPieceId,
    highlightedSquares,
    captureSquares,
  } = state;

  const squareMap = useMemo(() => buildSquareMap(pieces), [pieces]);

  const highlightSet = useMemo(() => new Set(highlightedSquares.map(posKey)), [highlightedSquares]);
  const captureSet   = useMemo(() => new Set(captureSquares.map(posKey)), [captureSquares]);

  const selectedPiece = selectedPieceId
    ? pieces.find(p => p.id === selectedPieceId)
    : null;
  const selectedKey = selectedPiece ? posKey(selectedPiece.position) : null;

  const rows = Array.from({ length: 8 }, (_, i) => i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

  return (
    <View style={styles.board}>
      {rows.map(row => (
        <View key={row} style={styles.row}>
          {cols.map(col => {
            const key = `${row},${col}`;
            const isLight = (row + col) % 2 === 0;
            const piece = squareMap.get(key);
            const isHighlighted = highlightSet.has(key);
            const isCapture = captureSet.has(key);
            const isSelected = key === selectedKey;
            const isPoisoned = piece?.poisoned ?? false;

            const bgColor = isLight ? LIGHT_SQ : DARK_SQ;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.cell,
                  { backgroundColor: bgColor, width: CELL, height: CELL },
                  isSelected && styles.selectedCell,
                  isCapture && styles.captureCell,
                ]}
                onPress={() => onSquarePress({ row, col })}
                activeOpacity={0.8}
              >
                {/* Move dot */}
                {isHighlighted && !piece && (
                  <View style={styles.moveDot} />
                )}

                {/* Capture overlay */}
                {isCapture && piece && (
                  <View style={styles.captureRing} />
                )}

                {/* Piece symbol */}
                {piece && (
                  <Text
                    style={[
                      styles.pieceText,
                      piece.team === 'player' ? styles.playerPiece : styles.enemyPiece,
                      isPoisoned && styles.poisonedPiece,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {PIECE_SYMBOL[`${piece.team}_${piece.type}`] ?? '?'}
                  </Text>
                )}

                {/* Poison indicator */}
                {isPoisoned && (
                  <View style={styles.poisonDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#5a3e1b',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedCell: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  captureCell: {
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  pieceText: {
    fontSize: CELL * 0.65,
    lineHeight: CELL * 0.75,
    textAlign: 'center',
  },
  playerPiece: {
    color: '#1a1a1a',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  enemyPiece: {
    color: '#8B0000',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  poisonedPiece: {
    color: '#6B0AC9',
  },
  moveDot: {
    width: CELL * 0.3,
    height: CELL * 0.3,
    borderRadius: CELL * 0.15,
    backgroundColor: 'rgba(30, 200, 30, 0.7)',
  },
  captureRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 60, 60, 0.8)',
    backgroundColor: 'rgba(255, 60, 60, 0.15)',
  },
  poisonDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9B30FF',
  },
});
