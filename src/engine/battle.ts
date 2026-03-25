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
  Tile,
  TileType,
  RelicInstance,
  MoveCard,
  EnemyScript,
  LevelType,
  WinCondition,
  BoardLayout,
} from './types';
import { classifyMoves, pieceAt } from './moves';
import { buildStartingDeck, drawCards, shuffleDeck } from './cards';
import { dispatchEvent, EVENTS } from './events';
import { computeEnemyMove, GUARD_SCRIPT, getNextIntent } from './enemy-ai';
import { EnemyFormation } from './formations';
import { RunState, PieceConfig } from './run';

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
    // Player party (bottom of board: rows 6–7)
    makePiece('p_hero',     'HERO',     'player', 7, 4),
    makePiece('p_ranger',   'RANGER',   'player', 7, 2),
    makePiece('p_brawler',  'BRAWLER',  'player', 7, 1),
    makePiece('p_guardian', 'GUARDIAN', 'player', 7, 0),
    makePiece('p_rogue1',   'ROGUE',    'player', 6, 2),
    makePiece('p_rogue2',   'ROGUE',    'player', 6, 3),
    makePiece('p_rogue3',   'ROGUE',    'player', 6, 4),

    // Enemy forces (top of board: rows 0–1)
    makePiece('e_hero',     'HERO',     'enemy', 0, 4),
    makePiece('e_guardian', 'GUARDIAN', 'enemy', 0, 7),
    makePiece('e_brawler',  'BRAWLER',  'enemy', 0, 6),
    makePiece('e_rogue1',   'ROGUE',    'enemy', 1, 3),
    makePiece('e_rogue2',   'ROGUE',    'enemy', 1, 4),
    makePiece('e_rogue3',   'ROGUE',    'enemy', 1, 5),
  ];
}

/** Build a rows×cols grid of FLOOR tiles, with optional tile overrides. */
function buildBoard(rows: number, cols: number, layout?: BoardLayout): Tile[][] {
  const board: Tile[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: 'FLOOR' as const })),
  );
  if (layout?.tiles) {
    for (const { row, col, type } of layout.tiles) {
      if (board[row]?.[col] !== undefined) {
        board[row][col] = { type: type as TileType };
      }
    }
  }
  return board;
}

const STARTING_RELICS: RelicInstance[] = [
  { relicId: 'blood_rogue', counter: 0 },
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
    board: buildBoard(8, 8),
    rows: 8,
    cols: 8,
    levelType: 'skirmish' as LevelType,
    winCondition: { type: 'eliminate_all' } as WinCondition,
    gauntletTurnsLeft: -1,
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
    selectableSquares: [],
    highlightedSquares: [],
    captureSquares: [],
    extraTurnPieceId: null,
    winner: null,
    gold: 0,
    log: ['The dungeon awaits. Draw a card and move your party.'],
    enemyIntent: GUARD_SCRIPT.steps[0].description,
  };
}

// ─── Player starting positions (dynamic, bottom of board) ────────────────────

/** Compute player spawn positions relative to the bottom of a rows×cols board. */
function getPlayerPositions(rows: number, cols: number): Position[] {
  const bot = rows - 1;
  const sec = rows - 2;
  const mid = Math.floor((cols - 1) / 2);
  const clamp = (v: number) => Math.max(0, Math.min(cols - 1, v));
  return [
    { row: bot, col: clamp(mid) },      // slot 0 — HERO / lead piece
    { row: bot, col: clamp(mid - 2) },  // slot 1
    { row: bot, col: clamp(mid + 2) },  // slot 2
    { row: sec, col: clamp(mid - 2) },  // slot 3
    { row: sec, col: clamp(mid) },      // slot 4
    { row: sec, col: clamp(mid + 2) },  // slot 5
  ];
}

/**
 * Create a BattleState initialised from the player's current run state
 * and a specific enemy formation.
 */
export function createBattleFromRun(
  runState: RunState,
  formation: EnemyFormation,
): BattleState {
  const rows = formation.layout?.rows ?? 8;
  const cols = formation.layout?.cols ?? 8;
  const levelType: LevelType = formation.levelType ?? 'skirmish';
  const winCondition: WinCondition = formation.winCondition ?? { type: 'eliminate_all' };
  const gauntletTurnsLeft = winCondition.type === 'survive_turns' ? winCondition.turns : -1;

  const playerPositions = getPlayerPositions(rows, cols);

  // Build player pieces from PieceConfigs with assigned board positions
  const playerPieces: Piece[] = runState.playerPieces.map((cfg, i) => ({
    id: cfg.id,
    type: cfg.type,
    team: 'player' as Team,
    position: playerPositions[i] ?? { row: rows - 1, col: i },
    upgrades: cfg.upgrades,
    poisoned: false,
    hasMoved: false,
  }));

  // Build enemy pieces from the formation descriptor
  const enemyPieces: Piece[] = formation.pieces.map((fp, i) => ({
    id: `e_${i}_${fp.type.toLowerCase()}`,
    type: fp.type,
    team: 'enemy' as Team,
    position: { row: fp.row, col: fp.col },
    upgrades: [],
    poisoned: false,
    hasMoved: false,
  }));

  const pieces = [...playerPieces, ...enemyPieces];

  // Use the run deck (shuffled fresh each battle)
  const deck = shuffleDeck([...runState.deck]);
  const { drawn: hand, newDeck } = drawCards(deck, [], 4);

  return {
    pieces,
    board: buildBoard(rows, cols, formation.layout),
    rows,
    cols,
    levelType,
    winCondition,
    gauntletTurnsLeft,
    playerHand: hand,
    playerDeck: newDeck,
    playerDiscard: [],
    relics: runState.relics,
    phase: 'player_select_card',
    turn: 1,
    enemyScriptStep: 0,
    enemyScript: formation.script,
    playerHp: runState.playerHp,
    maxPlayerHp: runState.maxPlayerHp,
    comboCount: 0,
    consecutiveCaptures: 0,
    selectedCardId: null,
    selectedPieceId: null,
    selectableSquares: [],
    highlightedSquares: [],
    captureSquares: [],
    extraTurnPieceId: null,
    winner: null,
    gold: 0,
    log: [`${formation.name} — Battle begins!`],
    enemyIntent: formation.script.steps[0].description,
  };
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export type BattleAction =
  | { type: 'SELECT_CARD';        cardId: string }
  | { type: 'DESELECT' }
  | { type: 'SELECT_PIECE';       pieceId: string }
  | { type: 'SELECT_DESTINATION'; position: Position }
  | { type: 'ENEMY_MOVE' }
  | { type: 'SKIP_EXTRA_TURN' }
  | { type: 'RESTART' };

// ─── Helper: check win/loss ───────────────────────────────────────────────────

function checkWinCondition(state: BattleState): Team | null {
  const playerHeroAlive = state.pieces.some(p => p.team === 'player' && p.type === 'HERO');
  if (!playerHeroAlive) return 'enemy';

  switch (state.winCondition.type) {
    case 'eliminate_all': {
      const enemyAlive = state.pieces.some(p => p.team === 'enemy');
      return enemyAlive ? null : 'player';
    }
    case 'survive_turns': {
      return state.gauntletTurnsLeft <= 0 ? 'player' : null;
    }
  }
}

// ─── Ability card helpers ─────────────────────────────────────────────────────

/** Effects that use standard move-generation. All others are abilities. */
const MOVEMENT_EFFECTS = new Set<string>([
  'NORMAL', 'CHAIN', 'DIAGONAL_SWEEP', 'CASTLE', 'GAMBIT',
]);

function isAbilityEffect(effect: string): boolean {
  return !MOVEMENT_EFFECTS.has(effect);
}

function inBounds(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/** Slide a piece `dist` squares in direction (dr, dc), stopping at edges, walls, or pieces. */
function slidePush(
  pieces: Piece[],
  board: Tile[][],
  targetId: string,
  dr: number,
  dc: number,
  dist: number,
): Piece[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 8;
  const target = pieces.find(p => p.id === targetId);
  if (!target) return pieces;
  let r = target.position.row;
  let c = target.position.col;
  for (let i = 0; i < dist; i++) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc, rows, cols)) break;
    if (board[nr][nc].type === 'WALL') break;
    if (pieceAt(pieces, nr, nc)) break;
    r = nr; c = nc;
  }
  return pieces.map(p =>
    p.id === targetId ? { ...p, position: { row: r, col: c } } : p,
  );
}

/** Pull a piece up to `dist` squares toward `toward`, stopping when adjacent or blocked. */
function slidePull(
  pieces: Piece[],
  board: Tile[][],
  targetId: string,
  toward: Position,
  dist: number,
): Piece[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 8;
  const target = pieces.find(p => p.id === targetId);
  if (!target) return pieces;
  const dr = Math.sign(toward.row - target.position.row);
  const dc = Math.sign(toward.col - target.position.col);
  let r = target.position.row;
  let c = target.position.col;
  for (let i = 0; i < dist; i++) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr === toward.row && nc === toward.col) break; // don't land on caster
    if (!inBounds(nr, nc, rows, cols)) break;
    if (board[nr][nc].type === 'WALL') break;
    if (pieceAt(pieces, nr, nc)) break;
    r = nr; c = nc;
  }
  return pieces.map(p =>
    p.id === targetId ? { ...p, position: { row: r, col: c } } : p,
  );
}

/** Compute valid target squares for an ability card after a piece is selected. */
function computeAbilityTargets(
  state: BattleState,
  piece: Piece,
  card: MoveCard,
): { abMoves: Position[]; abCaptures: Position[] } {
  const { row, col } = piece.position;
  const range = card.abilityPower ?? 3;

  switch (card.effect) {
    case 'PUSH': {
      // All immediately adjacent (8-directional) enemy squares
      const abCaptures: Position[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr; const c = col + dc;
          if (!inBounds(r, c, state.rows, state.cols)) continue;
          const p = pieceAt(state.pieces, r, c);
          if (p && p.team === 'enemy') abCaptures.push({ row: r, col: c });
        }
      }
      return { abMoves: [], abCaptures };
    }

    case 'PULL': {
      // Enemies on straight/diagonal lines within `range`, blocked by walls/pieces
      const abCaptures: Position[] = [];
      const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of DIRS) {
        for (let step = 1; step <= range; step++) {
          const r = row + dr * step; const c = col + dc * step;
          if (!inBounds(r, c, state.rows, state.cols)) break;
          if (state.board[r][c].type === 'WALL') break;
          const p = pieceAt(state.pieces, r, c);
          if (p) {
            if (p.team === 'enemy') abCaptures.push({ row: r, col: c });
            break;
          }
        }
      }
      return { abMoves: [], abCaptures };
    }

    case 'TELEPORT': {
      // Empty squares within Manhattan distance ≤ range
      const abMoves: Position[] = [];
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const dist = Math.abs(r - row) + Math.abs(c - col);
          if (dist === 0 || dist > range) continue;
          if (state.board[r][c].type === 'WALL') continue;
          if (!pieceAt(state.pieces, r, c)) abMoves.push({ row: r, col: c });
        }
      }
      return { abMoves, abCaptures: [] };
    }

    case 'SWAP_ALLY': {
      const abMoves = state.pieces
        .filter(p => p.team === 'player' && p.id !== piece.id)
        .map(p => p.position);
      return { abMoves, abCaptures: [] };
    }

    default:
      return { abMoves: [], abCaptures: [] };
  }
}

/** Execute a targeted ability (PUSH / PULL / TELEPORT / SWAP_ALLY). */
function executeAbility(
  state: BattleState,
  piece: Piece,
  target: Position,
  card: MoveCard,
): BattleState {
  let s = { ...state };
  const power = card.abilityPower ?? 2;
  let logMsg = '';

  switch (card.effect) {
    case 'PUSH': {
      const enemy = pieceAt(s.pieces, target.row, target.col);
      if (!enemy || enemy.team !== 'enemy') return state;
      const dr = Math.sign(target.row - piece.position.row);
      const dc = Math.sign(target.col - piece.position.col);
      s = { ...s, pieces: slidePush(s.pieces, s.board, enemy.id, dr, dc, power) };
      logMsg = `${piece.type} shoved ${enemy.type} ${power} sq away!`;
      break;
    }
    case 'PULL': {
      const enemy = pieceAt(s.pieces, target.row, target.col);
      if (!enemy || enemy.team !== 'enemy') return state;
      s = { ...s, pieces: slidePull(s.pieces, s.board, enemy.id, piece.position, power) };
      logMsg = `${piece.type} yanked ${enemy.type} ${power} steps closer!`;
      break;
    }
    case 'TELEPORT': {
      if (pieceAt(s.pieces, target.row, target.col)) return state;
      s = {
        ...s,
        pieces: s.pieces.map(p =>
          p.id === piece.id ? { ...p, position: target, hasMoved: true } : p,
        ),
      };
      logMsg = `${piece.type} blinked to (${target.row + 1},${target.col + 1})!`;
      break;
    }
    case 'SWAP_ALLY': {
      const ally = pieceAt(s.pieces, target.row, target.col);
      if (!ally || ally.team !== 'player' || ally.id === piece.id) return state;
      s = {
        ...s,
        pieces: s.pieces.map(p => {
          if (p.id === piece.id) return { ...p, position: target };
          if (p.id === ally.id) return { ...p, position: piece.position };
          return p;
        }),
      };
      logMsg = `${piece.type} swapped places with ${ally.type}!`;
      break;
    }
    default:
      return state;
  }

  s = applyCardCost(s, card);

  return {
    ...s,
    log: [...s.log, logMsg],
    playerHand: s.playerHand.filter(c => c.id !== card.id),
    playerDiscard: [...s.playerDiscard, card],
    selectedCardId: null,
    selectedPieceId: null,
    selectableSquares: [],
    highlightedSquares: [],
    captureSquares: [],
    extraTurnPieceId: null,
    phase: s.phase === 'battle_over' ? 'battle_over' : 'enemy_turn',
  };
}

/** Execute REPULSE — instant AoE, called directly from SELECT_PIECE. */
function executeRepulse(state: BattleState, piece: Piece, card: MoveCard): BattleState {
  let s = { ...state };
  const power = card.abilityPower ?? 2;

  const adjacent = s.pieces.filter(p =>
    p.team === 'enemy' &&
    Math.abs(p.position.row - piece.position.row) <= 1 &&
    Math.abs(p.position.col - piece.position.col) <= 1 &&
    !(p.position.row === piece.position.row && p.position.col === piece.position.col),
  );

  for (const enemy of adjacent) {
    const dr = Math.sign(enemy.position.row - piece.position.row);
    const dc = Math.sign(enemy.position.col - piece.position.col);
    s = { ...s, pieces: slidePush(s.pieces, s.board, enemy.id, dr, dc, power) };
  }

  const logMsg = adjacent.length > 0
    ? `${piece.type} burst: pushed ${adjacent.length} enemies outward!`
    : `${piece.type} burst: no adjacent enemies.`;

  s = applyCardCost(s, card);

  return {
    ...s,
    log: [...s.log, logMsg],
    playerHand: s.playerHand.filter(c => c.id !== card.id),
    playerDiscard: [...s.playerDiscard, card],
    selectedCardId: null,
    selectedPieceId: null,
    selectableSquares: [],
    highlightedSquares: [],
    captureSquares: [],
    extraTurnPieceId: null,
    phase: s.phase === 'battle_over' ? 'battle_over' : 'enemy_turn',
  };
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

  // 1. Emit onCardPlay (include card object so relics can inspect tags)
  s = dispatchEvent(s, { type: EVENTS.ON_CARD_PLAY, pieceId: piece.id, cardId: card.id, card });

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

  // 3b. LAVA hazard — piece takes 1 damage when landing on lava
  const landedTile = s.board[destination.row]?.[destination.col];
  if (landedTile?.type === 'LAVA') {
    const newHp = Math.max(0, s.playerHp - 1);
    s = {
      ...s,
      playerHp: newHp,
      log: [...s.log, `${piece.type} stepped on lava! (−1 HP)`],
      winner: newHp <= 0 ? ('enemy' as Team) : s.winner,
      phase: newHp <= 0 ? 'battle_over' : s.phase,
    };
    if (newHp <= 0) {
      return { ...s, log: [...s.log, 'Defeat! Your Hero has burned.'] };
    }
  }

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
      log: [...s.log, `Defeated ${capturedPiece.type}! Combo ×${s.consecutiveCaptures + 1}. Gold +1`],
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

  // 7. Apply HP cost (Arcane Surge / Blood Ritual etc.)
  s = applyCardCost(s, card);

  // 8. Remove played card, move to discard
  s = {
    ...s,
    playerHand: s.playerHand.filter(c => c.id !== card.id),
    playerDiscard: [...s.playerDiscard, card],
    selectedCardId: null,
    selectedPieceId: null,
    selectableSquares: [],
    highlightedSquares: [],
    captureSquares: [],
  };

  // 9. Check outcome
  const outcome = checkWinCondition(s);
  if (outcome) {
    if (outcome === 'player') {
      s = dispatchEvent(s, { type: EVENTS.ON_BATTLE_WIN });
    }
    const victoryMsg = s.winCondition.type === 'survive_turns'
      ? 'Victory! You survived the onslaught!'
      : 'Victory! All enemies slain!';
    return {
      ...s,
      winner: outcome,
      phase: 'battle_over',
      log: [...s.log, outcome === 'player' ? victoryMsg : 'Defeat! Your Hero has fallen.'],
    };
  }

  // 10. Transition to enemy turn, or grant SIEGE Guardian a bonus action
  // (only on the first capture of a turn — extra turns don't chain)
  if (s.extraTurnPieceId !== null) {
    // This was the bonus action — consume it and end the turn
    return { ...s, phase: 'enemy_turn', extraTurnPieceId: null };
  }
  const earnsSiege = isCapture && piece.type === 'GUARDIAN' && piece.upgrades.includes('SIEGE');
  if (earnsSiege) {
    return { ...s, phase: 'player_select_card', extraTurnPieceId: piece.id,
      log: [...s.log, 'SIEGE: Guardian earns a bonus action!'] };
  }
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
    s = { ...s, log: [...s.log, `Enemy defeated your ${captured?.type ?? 'ally'}!`] };
    s = dispatchEvent(s, { type: EVENTS.ON_PIECE_DEATH, pieceId: capturedPieceId });
  }

  // Emit onTurnEnd
  s = dispatchEvent(s, { type: EVENTS.ON_TURN_END });

  // Decrement gauntlet timer
  if (s.winCondition.type === 'survive_turns' && s.gauntletTurnsLeft > 0) {
    s = { ...s, gauntletTurnsLeft: s.gauntletTurnsLeft - 1 };
  }

  // Check outcome
  const outcome = checkWinCondition(s);
  if (outcome) {
    const victoryMsg = s.winCondition.type === 'survive_turns'
      ? 'Victory! You survived the onslaught!'
      : 'Victory!';
    return {
      ...s,
      winner: outcome,
      phase: 'battle_over',
      log: [...s.log, outcome === 'player' ? victoryMsg : 'Defeat! Your Hero has fallen.'],
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
      const allowedPhases = ['player_select_card', 'player_select_piece'];
      if (!allowedPhases.includes(state.phase)) return state;
      const card = state.playerHand.find(c => c.id === action.cardId);
      if (!card) return state;

      // SIEGE bonus turn: only allow cards for the piece that earned the bonus
      if (state.extraTurnPieceId !== null) {
        const extraPiece = state.pieces.find(p => p.id === state.extraTurnPieceId);
        if (!extraPiece || card.pieceType !== extraPiece.type) return state;
      }

      // Highlight all player pieces that can be moved with this card
      const selectable = state.pieces
        .filter(p => p.team === 'player' && p.type === card.pieceType)
        .map(p => p.position);

      return {
        ...state,
        selectedCardId: card.id,
        selectedPieceId: null,
        selectableSquares: selectable,
        highlightedSquares: [],
        captureSquares: [],
        phase: 'player_select_piece',
      };
    }

    // ── Deselect ──────────────────────────────────────────────────────────────
    case 'DESELECT': {
      if (state.phase === 'player_select_destination') {
        // Go back to piece selection — restore selectable highlights for the current card
        const card = state.playerHand.find(c => c.id === state.selectedCardId);
        const selectable = card
          ? state.pieces.filter(p => p.team === 'player' && p.type === card.pieceType).map(p => p.position)
          : [];
        return {
          ...state,
          selectedPieceId: null,
          selectableSquares: selectable,
          highlightedSquares: [],
          captureSquares: [],
          phase: 'player_select_piece',
        };
      }
      // From player_select_piece or any other phase — fully cancel card selection
      return {
        ...state,
        selectedCardId: null,
        selectedPieceId: null,
        selectableSquares: [],
        highlightedSquares: [],
        captureSquares: [],
        phase: 'player_select_card',
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

      // ── Instant ability: REPULSE fires immediately, no target selection ──
      if (card.effect === 'REPULSE') {
        return executeRepulse(state, piece, card);
      }

      // ── Targeted ability: compute valid targets instead of legal moves ──
      if (isAbilityEffect(card.effect)) {
        const { abMoves, abCaptures } = computeAbilityTargets(state, piece, card);
        if (abMoves.length === 0 && abCaptures.length === 0) {
          return {
            ...state,
            log: [...state.log, `${piece.type}: no valid targets for ${card.name}.`],
          };
        }
        return {
          ...state,
          selectedPieceId: piece.id,
          selectableSquares: [],
          highlightedSquares: abMoves,
          captureSquares: abCaptures,
          phase: 'player_select_destination',
        };
      }

      // ── Standard movement card ──
      const { moves, captures } = classifyMoves(piece, state.pieces, state.board);

      if (moves.length === 0 && captures.length === 0) {
        return {
          ...state,
          log: [...state.log, `${piece.type} has no legal moves.`],
        };
      }

      return {
        ...state,
        selectedPieceId: piece.id,
        selectableSquares: [],
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
        // Tap on invalid square — go back to piece selection
        return {
          ...state,
          selectedPieceId: null,
          highlightedSquares: [],
          captureSquares: [],
          phase: 'player_select_piece',
        };
      }

      // Route to ability execution or standard movement
      if (isAbilityEffect(card.effect)) {
        return executeAbility(state, piece, action.position, card);
      }

      return executePlayerMove(state, piece, action.position, card);
    }

    // ── Skip SIEGE bonus action ───────────────────────────────────────────────
    case 'SKIP_EXTRA_TURN': {
      if (state.extraTurnPieceId === null) return state;
      return { ...state, extraTurnPieceId: null, phase: 'enemy_turn' };
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
