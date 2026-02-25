/**
 * battle.ts — Battle state initialization and reducer
 *
 * All game logic lives here as pure functions:
 *   - createInitialBattleState()  — set up the opening position
 *   - battleReducer()             — dispatch actions → new BattleState
 *
 * Actions:
 *   SELECT_CARD        — player picks a card from their hand
 *   DESELECT           — clear current selection
 *   SELECT_PIECE       — player picks a piece to move
 *   SELECT_DESTINATION — player picks a destination, executes the move
 *   ENEMY_MOVE         — apply a pre-computed enemy move
 *   RESTART            — reset to initial state
 */

import {
  BattleState,
  Piece,
  Position,
  Team,
  RelicInstance,
  MoveCard,
  EnemyScript,
} from './types';
import { classifyMoves, pieceAt } from './moves';
import { buildStartingDeck, drawCards, shuffleDeck } from './cards';
import { dispatchEvent, EVENTS } from './events';
import { computeEnemyMove, GUARD_SCRIPT } from './enemy-ai';

// ─── Opening Position ─────────────────────────────────────────────────────────

function makePiece(
  id: string,
  type: Piece['type'],
  team: Team,
  row: number,
  col: number,
): Piece {
  return { id, type, team, position: { row, col }, upgrades: [], poisoned: false, hasMoved: false };
}

function buildOpeningPieces(): Piece[] {
  return [
    // Player pieces (bottom of board: rows 6–7)
    makePiece('p_king',   'KING',   'player', 7, 4),
    makePiece('p_bishop', 'BISHOP', 'player', 7, 2),
    makePiece('p_knight', 'KNIGHT', 'player', 7, 1),
    makePiece('p_rook',   'ROOK',   'player', 7, 0),
    makePiece('p_pawn1',  'PAWN',   'player', 6, 2),
    makePiece('p_pawn2',  'PAWN',   'player', 6, 3),
    makePiece('p_pawn3',  'PAWN',   'player', 6, 4),

    // Enemy pieces (top of board: rows 0–1)
    makePiece('e_king',   'KING',   'enemy', 0, 4),
    makePiece('e_rook',   'ROOK',   'enemy', 0, 7),
    makePiece('e_knight', 'KNIGHT', 'enemy', 0, 6),
    makePiece('e_pawn1',  'PAWN',   'enemy', 1, 3),
    makePiece('e_pawn2',  'PAWN',   'enemy', 1, 4),
    makePiece('e_pawn3',  'PAWN',   'enemy', 1, 5),
  ];
}

const STARTING_RELICS: RelicInstance[] = [
  { relicId: 'blood_pawn', counter: 0 },
];

// ─── State Factory ────────────────────────────────────────────────────────────

export function createInitialBattleState(): BattleState {
  const pieces = buildOpeningPieces();
  const playerTypes = pieces
    .filter(p => p.team === 'player')
    .map(p => p.type);

  const deckUnsorted = buildStartingDeck(playerTypes);
  const deck = shuffleDeck(deckUnsorted);

  // Draw opening hand of 4 cards
  const { drawn: hand, newDeck } = drawCards(deck, [], 4);

  return {
    pieces,
    playerHand: hand,
    playerDeck: newDeck,
    playerDiscard: [],
    relics: STARTING_RELICS,
    phase: 'player_select_card',
    turn: 1,
    enemyScriptStep: 0,
    enemyScript: GUARD_SCRIPT,
    playerHp: 20,
    maxPlayerHp: 20,
    comboCount: 0,
    consecutiveCaptures: 0,
    selectedCardId: null,
    selectedPieceId: null,
    highlightedSquares: [],
    captureSquares: [],
    winner: null,
    gold: 0,
    log: ['Battle begins! Draw your card and move a piece.'],
    enemyIntent: GUARD_SCRIPT.steps[0].description,
  };
}

// ─── Run-Based Battle Factory ─────────────────────────────────────────────────

/**
 * Build a BattleState from a RunState + Encounter.
 * Imports are done lazily (via function params) to avoid circular deps.
 */
export function createBattleStateFromEncounter(
  runHp: number,
  runMaxHp: number,
  runDeck: MoveCard[],
  runRelicIds: string[],
  runPieceUpgrades: { pieceType: Piece['type']; upgrade: string }[],
  playerPieceLayout: { idSuffix: string; type: Piece['type']; row: number; col: number }[],
  enemyPieces: Piece[],
  script: EnemyScript,
  encounterName: string,
): BattleState {
  // Build player pieces, applying any persisted upgrades
  const playerPieces: Piece[] = playerPieceLayout.map(sp => {
    const upgradeRecord = runPieceUpgrades.find(u => u.pieceType === sp.type);
    return {
      id: `p_${sp.idSuffix}`,
      type: sp.type,
      team: 'player',
      position: { row: sp.row, col: sp.col },
      upgrades: upgradeRecord ? [upgradeRecord.upgrade as any] : [],
      poisoned: false,
      hasMoved: false,
    };
  });

  const allPieces = [...playerPieces, ...enemyPieces];

  // Shuffle run deck and draw opening hand
  const shuffled = shuffleDeck(runDeck);
  const { drawn: hand, newDeck } = drawCards(shuffled, [], 4);

  // Convert relic IDs to RelicInstance format
  const relics: RelicInstance[] = runRelicIds.map(id => ({ relicId: id, counter: 0 }));

  return {
    pieces: allPieces,
    playerHand: hand,
    playerDeck: newDeck,
    playerDiscard: [],
    relics,
    phase: 'player_select_card',
    turn: 1,
    enemyScriptStep: 0,
    enemyScript: script,
    playerHp: runHp,
    maxPlayerHp: runMaxHp,
    comboCount: 0,
    consecutiveCaptures: 0,
    selectedCardId: null,
    selectedPieceId: null,
    highlightedSquares: [],
    captureSquares: [],
    winner: null,
    gold: 0,
    log: [`Battle: ${encounterName}! Draw your card and move a piece.`],
    enemyIntent: script.steps[0].description,
  };
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export type BattleAction =
  | { type: 'SELECT_CARD';        cardId: string }
  | { type: 'DESELECT' }
  | { type: 'SELECT_PIECE';       pieceId: string }
  | { type: 'SELECT_DESTINATION'; position: Position }
  | { type: 'ENEMY_MOVE' }
  | { type: 'RESTART' };

// ─── Helper: check win/loss ───────────────────────────────────────────────────

function checkOutcome(pieces: Piece[]): Team | null {
  const enemyAlive = pieces.some(p => p.team === 'enemy');
  const playerKingAlive = pieces.some(p => p.team === 'player' && p.type === 'KING');
  if (!enemyAlive) return 'player';
  if (!playerKingAlive) return 'enemy';
  return null;
}

// ─── Helper: apply HP cost for card effects ───────────────────────────────────

function applyCardCost(state: BattleState, card: MoveCard): BattleState {
  if (!card.hpCost) return state;
  const newHp = Math.max(0, state.playerHp - card.hpCost);
  return {
    ...state,
    playerHp: newHp,
    log: [...state.log, `${card.name}: paid ${card.hpCost} HP (now ${newHp}/${state.maxPlayerHp})`],
    winner: newHp <= 0 ? 'enemy' : state.winner,
    phase: newHp <= 0 ? 'battle_over' : state.phase,
  };
}

// ─── Helper: execute a player move (land piece, resolve capture, emit events) ─

function executePlayerMove(
  state: BattleState,
  piece: Piece,
  destination: Position,
  card: MoveCard,
): BattleState {
  let s = { ...state };

  // 1. Emit onCardPlay
  s = dispatchEvent(s, { type: EVENTS.ON_CARD_PLAY, pieceId: piece.id, cardId: card.id });

  // 2. Check for capture
  const capturedPiece = pieceAt(s.pieces, destination.row, destination.col);
  const isCapture = capturedPiece !== undefined && capturedPiece.team === 'enemy';

  // 3. Move piece
  s = {
    ...s,
    pieces: s.pieces
      .filter(p => !(p.position.row === destination.row && p.position.col === destination.col && p.team === 'enemy'))
      .map(p => p.id === piece.id
        ? { ...p, position: destination, hasMoved: true }
        : p,
      ),
  };

  // 4. Emit onLand
  s = dispatchEvent(s, {
    type: EVENTS.ON_LAND,
    pieceId: piece.id,
    toPosition: destination,
    fromPosition: piece.position,
  });

  // 5. Handle capture
  if (isCapture && capturedPiece) {
    s = {
      ...s,
      consecutiveCaptures: s.consecutiveCaptures + 1,
      gold: s.gold + 1,
      log: [...s.log, `Captured ${capturedPiece.type}! Combo ×${s.consecutiveCaptures + 1}. Gold +1`],
    };

    // Emit onCapture
    s = dispatchEvent(s, {
      type: EVENTS.ON_CAPTURE,
      pieceId: piece.id,
      capturedPieceId: capturedPiece.id,
      fromPosition: piece.position,
      toPosition: destination,
    });

    // Emit onPieceDeath for the captured piece
    s = dispatchEvent(s, {
      type: EVENTS.ON_PIECE_DEATH,
      pieceId: capturedPiece.id,
    });
  } else {
    // No capture — reset combo
    if (s.consecutiveCaptures > 0) {
      s = { ...s, consecutiveCaptures: 0 };
    }
  }

  // 6. Check poisoned enemies — they die at end of player turn
  const poisonedEnemies = s.pieces.filter(p => p.team === 'enemy' && p.poisoned);
  if (poisonedEnemies.length > 0) {
    s = {
      ...s,
      pieces: s.pieces.filter(p => !(p.team === 'enemy' && p.poisoned)),
      log: [...s.log, `Poison killed ${poisonedEnemies.map(p => p.type).join(', ')}!`],
    };
  }

  // 7. Apply HP cost (Gambit etc.)
  s = applyCardCost(s, card);

  // 8. Remove played card, move to discard
  s = {
    ...s,
    playerHand: s.playerHand.filter(c => c.id !== card.id),
    playerDiscard: [...s.playerDiscard, card],
    selectedCardId: null,
    selectedPieceId: null,
    highlightedSquares: [],
    captureSquares: [],
  };

  // 9. Check outcome
  const outcome = checkOutcome(s.pieces);
  if (outcome) {
    if (outcome === 'player') {
      s = dispatchEvent(s, { type: EVENTS.ON_BATTLE_WIN });
    }
    return {
      ...s,
      winner: outcome,
      phase: 'battle_over',
      log: [...s.log, outcome === 'player' ? 'Victory! All enemies defeated!' : 'Defeat! Your king was captured.'],
    };
  }

  // 10. Transition to enemy turn
  return { ...s, phase: 'enemy_turn' };
}

// ─── Helper: resolve enemy turn ───────────────────────────────────────────────

function resolveEnemyTurn(state: BattleState): BattleState {
  let s = { ...state };

  // Emit onTurnStart for enemy
  s = dispatchEvent(s, { type: EVENTS.ON_TURN_START });

  const moveResult = computeEnemyMove(s, s.enemyScript);

  if (!moveResult) {
    // No enemy moves available — player wins
    return {
      ...s,
      winner: 'player',
      phase: 'battle_over',
      log: [...s.log, 'Enemies have no moves — Victory!'],
    };
  }

  const { movedPieceId, from, to, capturedPieceId, description } = moveResult;
  s = { ...s, log: [...s.log, `Enemy: ${description}`] };

  // Apply enemy move
  s = {
    ...s,
    pieces: s.pieces
      .filter(p => p.id !== capturedPieceId)  // remove captured player piece
      .map(p => p.id === movedPieceId
        ? { ...p, position: to, hasMoved: true }
        : p,
      ),
  };

  if (capturedPieceId) {
    const captured = state.pieces.find(p => p.id === capturedPieceId);
    s = { ...s, log: [...s.log, `Enemy captured your ${captured?.type ?? 'piece'}!`] };
    s = dispatchEvent(s, { type: EVENTS.ON_PIECE_DEATH, pieceId: capturedPieceId });
  }

  // Emit onTurnEnd
  s = dispatchEvent(s, { type: EVENTS.ON_TURN_END });

  // Check outcome
  const outcome = checkOutcome(s.pieces);
  if (outcome) {
    return {
      ...s,
      winner: outcome,
      phase: 'battle_over',
      log: [...s.log, outcome === 'player' ? 'Victory!' : 'Defeat! Your king was captured.'],
    };
  }

  // Draw up to 4 cards for the next player turn
  const handSize = 4;
  const toDraw = Math.max(0, handSize - s.playerHand.length);
  const { drawn, newDeck, newDiscard } = drawCards(s.playerDeck, s.playerDiscard, toDraw);

  // Advance script step and update intent
  const nextScriptStep = (s.enemyScriptStep + 1) % s.enemyScript.steps.length;
  const nextIntent = s.enemyScript.steps[nextScriptStep].description;

  return {
    ...s,
    playerHand: [...s.playerHand, ...drawn],
    playerDeck: newDeck,
    playerDiscard: newDiscard,
    turn: s.turn + 1,
    enemyScriptStep: nextScriptStep,
    enemyIntent: nextIntent,
    phase: 'player_select_card',
    log: [...s.log, `--- Turn ${s.turn + 1} ---`],
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  if (state.winner && action.type !== 'RESTART') return state;

  switch (action.type) {
    // ── Select a card ─────────────────────────────────────────────────────────
    case 'SELECT_CARD': {
      if (state.phase !== 'player_select_card') return state;
      const card = state.playerHand.find(c => c.id === action.cardId);
      if (!card) return state;

      return {
        ...state,
        selectedCardId: card.id,
        selectedPieceId: null,
        highlightedSquares: [],
        captureSquares: [],
        phase: 'player_select_piece',
      };
    }

    // ── Deselect ──────────────────────────────────────────────────────────────
    case 'DESELECT': {
      return {
        ...state,
        selectedCardId: null,
        selectedPieceId: null,
        highlightedSquares: [],
        captureSquares: [],
        phase: state.phase === 'player_select_destination'
          ? 'player_select_piece'
          : state.phase,
      };
    }

    // ── Select a piece ────────────────────────────────────────────────────────
    case 'SELECT_PIECE': {
      if (state.phase !== 'player_select_piece') return state;

      const card = state.playerHand.find(c => c.id === state.selectedCardId);
      if (!card) return state;

      const piece = state.pieces.find(
        p => p.id === action.pieceId && p.team === 'player' && p.type === card.pieceType,
      );
      if (!piece) return state;

      const { moves, captures } = classifyMoves(piece, state.pieces);

      if (moves.length === 0 && captures.length === 0) {
        return {
          ...state,
          log: [...state.log, `${piece.type} has no legal moves.`],
        };
      }

      return {
        ...state,
        selectedPieceId: piece.id,
        highlightedSquares: moves,
        captureSquares: captures,
        phase: 'player_select_destination',
      };
    }

    // ── Select a destination (execute move) ───────────────────────────────────
    case 'SELECT_DESTINATION': {
      if (state.phase !== 'player_select_destination') return state;

      const piece = state.pieces.find(p => p.id === state.selectedPieceId);
      const card = state.playerHand.find(c => c.id === state.selectedCardId);
      if (!piece || !card) return state;

      const { row, col } = action.position;
      const isValidMove = [
        ...state.highlightedSquares,
        ...state.captureSquares,
      ].some(sq => sq.row === row && sq.col === col);

      if (!isValidMove) {
        // Tap on invalid square — go back to card selection
        return {
          ...state,
          selectedPieceId: null,
          highlightedSquares: [],
          captureSquares: [],
          phase: 'player_select_piece',
        };
      }

      return executePlayerMove(state, piece, action.position, card);
    }

    // ── Enemy moves ───────────────────────────────────────────────────────────
    case 'ENEMY_MOVE': {
      if (state.phase !== 'enemy_turn') return state;
      return resolveEnemyTurn(state);
    }

    // ── Restart ───────────────────────────────────────────────────────────────
    case 'RESTART': {
      return createInitialBattleState();
    }
  }
}
