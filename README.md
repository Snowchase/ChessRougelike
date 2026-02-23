# ♟️ Chess Roguelike

A roguelike deckbuilder built with Expo/React Native where chess mechanics meet Balatro-style synergy building, Peglin-style combo chains, and Slay the Spire-style run structure.

-----

## 🎮 Concept

You control a set of chess pieces navigating a run — fighting turn-based encounters on a board, collecting relics, upgrading pieces, and building synergies between captures. Each run is unique. Death means starting over.

> Balatro’s joker synergies + Peglin’s combo chaining + chess tactics = this game.

-----

## 🗺️ Run Structure

```
Map → Encounter → Reward → Shop → Boss → Repeat
```

The map is a branching path (like Slay the Spire) with the following node types:

- ⚔️ **Normal Fight** — standard chess encounter
- 💀 **Elite Fight** — harder enemies, better rewards
- 🛒 **Shop** — buy cards, relics, upgrades
- 🔥 **Rest** — heal or upgrade a piece
- ❓ **Mystery Event** — narrative choice with consequences

Each **Act** ends with a Boss encounter with unique rules.

-----

## ⚔️ Battle System

### The Board

- Standard 8×8 grid
- Your pieces vs. enemy pieces
- Turn-based: you move, then the enemy moves

### Move Cards

Instead of clicking squares directly, you draw a hand of **Move Cards** each turn and choose one to play — this is where Balatro’s “what do I play?” tension lives.

|Card       |Piece |Effect                                     |
|-----------|------|-------------------------------------------|
|**Advance**|Pawn  |Move forward 1–2 squares                   |
|**Charge** |Knight|L-move + deal damage on landing            |
|**Sweep**  |Bishop|Diagonal move, hits all pieces in path     |
|**Castle** |Rook  |Move + swap positions with an adjacent ally|
|**Gambit** |Queen |Move any direction, costs 2 HP             |

Each turn you draw **3–5 cards** and pick one to play.

### Capture Chains (The Peglin Loop)

- Capturing an enemy piece triggers your **relics and passive effects**
- Consecutive captures build a **combo multiplier**
- Captured pieces drop gold or bonus effects

-----

## 💎 Relics (Balatro Jokers)

Relics are passive modifiers — the heart of the build system. They trigger on game events and create powerful synergies when combined.

|Relic               |Trigger            |Effect                                                    |
|--------------------|-------------------|----------------------------------------------------------|
|**Blood Pawn**      |On Capture         |Gain +1 HP per capture this battle                        |
|**Zwischenzug**     |On Card Play       |Every 3rd capture deals double damage                     |
|**Fork**            |On Land            |If your piece threatens 2+ enemies, draw an extra card    |
|**Poisoned Bishop** |On Capture (Bishop)|Enemies in the diagonal path get Poisoned (−1 HP/turn)    |
|**Endgame Protocol**|Passive            |If 3 or fewer pieces remain, all pieces gain +2 move range|


> **Example Build:** `Blood Pawn` + `Zwischenzug` + a Knight-heavy deck = a capture-chain snowball build.

-----

## ⬆️ Piece Upgrades (Nubby’s Number Style)

After each fight, choose **1 of 3 random upgrades** for your pieces:

|Base Piece|Upgrade             |Effect                               |
|----------|--------------------|-------------------------------------|
|Pawn      |**Promoted Pawn**   |Can move diagonally without capturing|
|Knight    |**Nightmare Knight**|Hits every square along the L-path   |
|Rook      |**Siege Tower**     |Captures don’t end your turn         |
|Bishop    |**Dark Bishop**     |Can capture on both square colors    |

-----

## 🤖 Enemy AI

Enemies follow **behavior scripts** with telegraphed intents (like Slay the Spire). The player can see what the enemy plans to do next turn and react accordingly.

```
Guard:
  Turn 1 — ADVANCE    (moves pawns forward)
  Turn 2 — THREATEN   (positions knight for a fork)
  Turn 3 — ATTACK     (captures if possible)
```

-----

## 🏗️ Core Data Models

```js
// Piece
{
  id: "p1",
  type: "KNIGHT",        // PAWN | KNIGHT | BISHOP | ROOK | QUEEN | KING
  team: "player",        // player | enemy
  position: { row: 6, col: 1 },
  upgrades: ["NIGHTMARE"]
}

// MoveCard
{
  id: "c1",
  pieceType: "KNIGHT",
  name: "Midnight Ride",
  baseDamage: 2,
  effect: "CHAIN",       // hits next square after landing
  rarity: "uncommon"
}

// Relic
{
  id: "r1",
  name: "Fork",
  trigger: "onLand",
  rarity: "rare",
  applyEffect: (gameState, event) => { /* pure function */ }
}
```

-----

## ⚡ Event System

Every meaningful action dispatches an event. Relics hook into these events — keeping all relic logic decoupled and composable.

```js
const EVENTS = {
  ON_CAPTURE:     "onCapture",
  ON_CARD_PLAY:   "onCardPlay",
  ON_LAND:        "onLand",
  ON_TURN_START:  "onTurnStart",
  ON_TURN_END:    "onTurnEnd",
  ON_PIECE_DEATH: "onPieceDeath",
  ON_BATTLE_WIN:  "onBattleWin"
}
```

-----

## 📱 Screen Flow

```
SplashScreen
└── MainMenu
      ├── NewRun → ClassSelect → MapScreen
      │                           ├── BattleScreen  ← core gameplay
      │                           ├── ShopScreen
      │                           ├── RewardScreen
      │                           └── EventScreen
      └── RunHistory (seeds, scores)
```

-----

## 🔨 Build Order

Get the core fun loop working before building around it. The **capture-chain + relic event system** is the game — everything else is scaffolding.

- [ ] **1. Board Renderer** — 8×8 grid, place and move pieces
- [ ] **2. Legal Move Calculator** — pure chess logic per piece type
- [ ] **3. Turn Loop** — draw cards → play card → enemy turn
- [ ] **4. Capture Chain Detection** — for combo triggers
- [ ] **5. Event Dispatcher + 3–4 Relics** — prove the synergy loop is fun
- [ ] **6. Map / Run Structure** — connect battles into a full run
- [ ] **7. Reward & Shop Screens** — card drafting and relic acquisition

-----

## 🧱 Tech Stack

- **Framework:** Expo / React Native
- **State Management:** React context or Zustand (run state, battle state)
- **Board Logic:** Pure JS — no dependencies needed
- **Navigation:** Expo Router or React Navigation

-----

## 🎯 Design Pillars

|Inspiration   |Mechanic               |This Game’s Version                     |
|--------------|-----------------------|----------------------------------------|
|Balatro       |Joker synergies        |Relic + capture chain combos            |
|Balatro       |Playing cards from hand|Choosing move cards each turn           |
|Peglin        |Peg combo chains       |Consecutive captures × relic multipliers|
|Peglin        |Damage orbs            |Combo captures scaling with relics      |
|Nubby’s       |Upgrade choices        |Piece upgrade selection after fights    |
|Slay the Spire|Enemy intents          |Telegraphed enemy move scripts          |
|Slay the Spire|Branching map          |Act-based run with node variety         |
