// ─── Core Enumerations ───────────────────────────────────────────────────────

export type PieceType = 'PAWN' | 'KNIGHT' | 'BISHOP' | 'ROOK' | 'QUEEN' | 'KING';
export type Team = 'player' | 'enemy';
export type UpgradeType = 'PROMOTED' | 'NIGHTMARE' | 'SIEGE' | 'DARK_BISHOP';
export type CardEffect = 'NORMAL' | 'CHAIN' | 'DIAGONAL_SWEEP' | 'CASTLE' | 'GAMBIT';
export type Rarity = 'common' | 'uncommon' | 'rare';

export type EventType =
  | 'onCapture'
  | 'onCardPlay'
  | 'onLand'
  | 'onTurnStart'
  | 'onTurnEnd'
  | 'onPieceDeath'
  | 'onBattleWin';

// ─── Positional Types ─────────────────────────────────────────────────────────

export interface Position {
  row: number;
  col: number;
}

// ─── Piece ────────────────────────────────────────────────────────────────────

export interface Piece {
  id: string;
  type: PieceType;
  team: Team;
  position: Position;
  upgrades: UpgradeType[];
  poisoned: boolean;       // Poisoned Bishop relic effect
  hasMoved: boolean;       // track first move (pawn double-step)
}

// ─── Move Cards ───────────────────────────────────────────────────────────────

export interface MoveCard {
  id: string;
  pieceType: PieceType;
  name: string;
  baseDamage: number;
  effect: CardEffect;
  rarity: Rarity;
  description: string;
  hpCost?: number;  // for Gambit
}

// ─── Relics ───────────────────────────────────────────────────────────────────

export interface RelicInstance {
  relicId: string;
  counter: number;  // generic counter (e.g. Zwischenzug counts captures)
}

// RelicDefinition uses a forward reference to BattleState; defined below.

// ─── Events ───────────────────────────────────────────────────────────────────

export interface GameEvent {
  type: EventType;
  pieceId?: string;           // acting piece
  capturedPieceId?: string;   // piece that was captured
  fromPosition?: Position;
  toPosition?: Position;
  cardId?: string;
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

export type EnemyActionType = 'ADVANCE' | 'THREATEN' | 'ATTACK';

export interface EnemyScriptStep {
  action: EnemyActionType;
  description: string;  // telegraphed intent shown to player
}

export interface EnemyScript {
  name: string;
  steps: EnemyScriptStep[];
}

// ─── Battle Phase & State ─────────────────────────────────────────────────────

export type BattlePhase =
  | 'player_select_card'
  | 'player_select_piece'
  | 'player_select_destination'
  | 'enemy_turn'
  | 'battle_over';

export interface BattleState {
  pieces: Piece[];

  // Card system
  playerHand: MoveCard[];
  playerDeck: MoveCard[];
  playerDiscard: MoveCard[];

  // Relics
  relics: RelicInstance[];

  // Turn state
  phase: BattlePhase;
  turn: number;            // increments each full round (player + enemy)
  enemyScriptStep: number; // cycles through enemy script
  enemyScript: EnemyScript; // which script the enemies follow this battle

  // Player vitals
  playerHp: number;
  maxPlayerHp: number;

  // Combo tracking
  comboCount: number;
  consecutiveCaptures: number;  // for Zwischenzug tracking

  // Selection state (UI)
  selectedCardId: string | null;
  selectedPieceId: string | null;
  highlightedSquares: Position[];   // valid move destinations
  captureSquares: Position[];       // valid capture destinations

  // Outcome
  winner: Team | null;
  gold: number;

  // Log & intent
  log: string[];
  enemyIntent: string;
}

// ─── Relic Definition (references BattleState & GameEvent) ───────────────────

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  trigger: EventType;
  rarity: Rarity;
  /** Pure function: returns partial state to merge. Mutate relicInstance.counter as needed. */
  apply: (
    state: BattleState,
    event: GameEvent,
    relicInstance: RelicInstance,
  ) => Partial<BattleState>;
}
