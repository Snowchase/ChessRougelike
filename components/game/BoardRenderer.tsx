/**
 * BoardRenderer.tsx — 8×8 dungeon board with piece placement and square highlighting
 *
 * Tile layer (rendered beneath pieces):
 *   FLOOR         — alternating light/dark dungeon stone
 *   WALL          — dark charcoal (#3d3d3d), impassable
 *   WATER         — deep blue (#1a4a6b), passable but damaging
 *   BREAKABLE_WALL— brown (#6b4a1a), breaks when struck by Brawler/Guardian
 *   LAVA          — deep red-orange (#8b2200), damages pieces that stand on it
 *
 * Piece symbols use two-letter labels colorable via text styling:
 *   Player pieces: dark (#1a1a1a)   Enemy pieces: dark red (#8B0000)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { Piece, Position, BattleState, TileType } from '@/src/engine/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.floor((SCREEN_WIDTH - 8) / 8) * 8; // fit 8 cells exactly
const CELL = BOARD_SIZE / 8;

const LIGHT_SQ = '#F0D9B5';
const DARK_SQ  = '#B58863';

const TILE_COLOR: Record<TileType, string | null> = {
  FLOOR:          null,           // null = use default light/dark square color
  WALL:           '#3d3d3d',
  WATER:          '#1a4a6b',
  BREAKABLE_WALL: '#6b4a1a',
  LAVA:           '#8b2200',
};

const TILE_LABEL: Record<TileType, string> = {
  FLOOR:          '',
  WALL:           '▪',
  WATER:          '≋',
  BREAKABLE_WALL: '▩',
  LAVA:           '▓',
};

/** Two-letter dungeon labels for each piece type. */
const PIECE_LABEL: Record<string, string> = {
  ROGUE:    'Rg',
  BRAWLER:  'Bw',
  RANGER:   'Rn',
  GUARDIAN: 'Gu',
  WITCH:    'Wt',
  HERO:     'Hr',
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
    board,
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

            const tile = board?.[row]?.[col];
            const tileType = tile?.type ?? 'FLOOR';
            const tileColor = TILE_COLOR[tileType];
            const bgColor = tileColor ?? (isLight ? LIGHT_SQ : DARK_SQ);
            const tileLabel = TILE_LABEL[tileType];

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
                {/* Tile environment label (walls, water, lava) */}
                {tileLabel !== '' && !piece && (
                  <Text style={[styles.tileLabel, tileType === 'LAVA' && styles.lavaTileLabel]}>
                    {tileLabel}
                  </Text>
                )}

                {/* Move dot */}
                {isHighlighted && !piece && (
                  <View style={styles.moveDot} />
                )}

                {/* Capture overlay */}
                {isCapture && piece && (
                  <View style={styles.captureRing} />
                )}

                {/* Piece label */}
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
                    {PIECE_LABEL[piece.type] ?? '??'}
                  </Text>
                )}

                {/* Poison indicator dot */}
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
  tileLabel: {
    fontSize: CELL * 0.45,
    color: 'rgba(255,255,255,0.35)',
    position: 'absolute',
  },
  lavaTileLabel: {
    color: 'rgba(255,120,0,0.5)',
  },
  pieceText: {
    fontSize: CELL * 0.38,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
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
