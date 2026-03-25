// ─── Core Enumerations ───────────────────────────────────────────────────────

export type PieceType = 'ROGUE' | 'BRAWLER' | 'RANGER' | 'GUARDIAN' | 'WITCH' | 'HERO';
export type Team = 'player' | 'enemy';
export type UpgradeType = 'VETERAN' | 'NIGHTMARE' | 'SIEGE' | 'DARK_RANGER';
export type CardEffect =
  // ── Movement effects ─────────────────────────────────────────
  | 'NORMAL'          // standard move/capture
  | 'CHAIN'           // move then strike diagonally
  | 'DIAGONAL_SWEEP'  // sweep all diagonals
  | 'CASTLE'          // rook march / swap
  | 'GAMBIT'          // any-direction, costs HP
  // ── Ability effects (no standard movement) ──────────────────
  | 'PUSH'            // shove a selected adjacent enemy N squares away
  | 'PULL'            // yank a distant enemy N squares closer
  | 'TELEPORT'        // reposition this piece to any empty square in range
  | 'SWAP_ALLY'       // swap positions with a friendly piece
  | 'REPULSE';        // instant AoE — push ALL adjacent enemies away
export type Rarity = 'common' | 'uncommon' | 'rare';

export type CardTag =
  | 'FORWARD'      // rogue/hero forward step
  | 'DIAGONAL'     // ranger diagonal attacks
  | 'LEAP'         // brawler knight jumps
  | 'CHAIN'        // follow-up second action
  | 'SWEEP'        // hits multiple squares at once
  | 'SACRIFICE'    // costs HP
  | 'DISPLACEMENT' // repositions enemy without capturing
  | 'MARCH'        // guardian straight-line slide
  | 'ABILITY';     // non-movement card

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

// ─── Level / Board Layout ─────────────────────────────────────────────────────

export type LevelType = 'skirmish' | 'gauntlet' | 'corridor' | 'lava_pit' | 'boss';

export interface BoardLayout {
  rows: number;
  cols: number;
  /** Per-cell overrides — WALL, LAVA, WATER, etc. */
  tiles?: Array<{ row: number; col: number; type: TileType }>;
}

export type WinCondition =
  | { type: 'eliminate_all' }
  | { type: 'survive_turns'; turns: number };

// ─── Tile ─────────────────────────────────────────────────────────────────────

export type TileType = 'FLOOR' | 'WALL' | 'WATER' | 'BREAKABLE_WALL' | 'LAVA';

export interface Tile {
  type: TileType;
  hp?: number;      // BREAKABLE_WALL durability (e.g. 2 hits to break)
  variant?: number; // visual variant for cracked states
}

// ─── Piece ────────────────────────────────────────────────────────────────────

export interface Piece {
  id: string;
  type: PieceType;
  team: Team;
  position: Position;
  upgrades: UpgradeType[];
  poisoned: boolean;       // Envenomed Ranger relic effect
  hasMoved: boolean;       // track first move (rogue double-step)
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
  hpCost?: number;       // for Gambit-style cards
  abilityPower?: number; // for ability cards: push distance, pull distance, teleport range
  tags?: CardTag[];      // synergy tags for relic interactions
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
  card?: MoveCard;            // full card object (for onCardPlay tag-based relics)
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
  board: Tile[][];   // grid of environment tiles (dimensions: rows × cols)

  // Board dimensions & level identity
  rows: number;
  cols: number;
  levelType: LevelType;
  winCondition: WinCondition;
  gauntletTurnsLeft: number;  // countdown for survive_turns; -1 otherwise

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
  enemyScript: EnemyScript; // the script used by enemies this battle

  // Player vitals
  playerHp: number;
  maxPlayerHp: number;

  // Combo tracking
  comboCount: number;
  consecutiveCaptures: number;  // for Zwischenzug tracking

  // Selection state (UI)
  selectedCardId: string | null;
  selectedPieceId: string | null;
  selectableSquares: Position[];    // positions of pieces that can be moved with the selected card
  highlightedSquares: Position[];   // valid move destinations
  captureSquares: Position[];       // valid capture destinations

  // Upgrade bonus actions
  extraTurnPieceId: string | null; // SIEGE Guardian earns one bonus action after capture

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
