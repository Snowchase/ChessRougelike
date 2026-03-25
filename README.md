# ♟️ Chess Roguelike

A roguelike deckbuilder built with Expo/React Native where chess mechanics meet Balatro-style synergy building, Peglin-style combo chains, and Slay the Spire-style run structure.

-----

## 🎮 Concept

You control a set of chess pieces navigating a run — fighting turn-based encounters on a board, collecting relics, upgrading pieces, and building synergies between captures. Each run is unique. Death means starting over.

> Balatro's joker synergies + Peglin's combo chaining + chess tactics = this game.

-----

## 🗺️ Run Structure

```
Map → Encounter → Reward → Shop → Boss → Repeat
```

The map is a branching path (like Slay the Spire) with the following node types:

- ⚔️ **Normal Fight** — standard chess encounter (various board shapes and objectives)
- 💀 **Elite Fight** — harder enemies, better rewards
- 🛒 **Shop** — buy cards, relics, upgrades
- 🔥 **Rest** — heal 5 HP
- ❓ **Mystery Event** — narrative choice with consequences *(placeholder — heals 2 HP)*

Each **Act** ends with a Boss encounter.

-----

## ⚔️ Battle System

### The Board

- Dynamic grid (currently 6×6, 8×4, 8×8 depending on level type)
- Your pieces vs. enemy pieces
- Turn-based: you move, then the enemy moves
- Environmental tiles: FLOOR, WALL (blocks movement), WATER, LAVA (damages on landing), BREAKABLE_WALL

### Piece Types

The game uses fantasy-themed pieces (not standard chess names):

| Game Piece  | Chess Equivalent | Movement                         |
|-------------|-----------------|----------------------------------|
| **Rogue**   | Pawn            | Forward 1–2, diagonal captures   |
| **Brawler** | Knight          | L-leap (jumps over pieces)       |
| **Ranger**  | Bishop          | Diagonal slides                  |
| **Guardian**| Rook            | Orthogonal slides                |
| **Witch**   | Queen           | All directions (slides)          |
| **Hero**    | King            | One step any direction; death = loss |

### Move Cards

You draw a hand of **4 Move Cards** each turn and choose one to play.

**Movement Cards** (activate chess movement for a piece type):

| Card Effect       | Description                                       |
|-------------------|---------------------------------------------------|
| **NORMAL**        | Standard move / capture                           |
| **CHAIN**         | Move then hit a diagonal square after landing     |
| **DIAGONAL_SWEEP**| Sweep all diagonals (Ranger)                      |
| **CASTLE**        | Rook-march or swap positions with an adjacent ally|
| **GAMBIT**        | Any direction, costs HP                           |

**Ability Cards** (manipulate the battlefield instead of moving):

| Card Effect  | Description                                            |
|--------------|--------------------------------------------------------|
| **PUSH**     | Shove an adjacent enemy N squares away                 |
| **PULL**     | Yank a distant enemy N squares closer (line of sight)  |
| **TELEPORT** | Reposition this piece anywhere within Manhattan range  |
| **SWAP_ALLY**| Swap positions with a friendly piece                   |
| **REPULSE**  | Instant AoE — push ALL adjacent enemies outward        |

### Level Types & Win Conditions

Encounters aren't all the same board or objective:

| Level Type    | Board    | Win Condition                         |
|---------------|----------|---------------------------------------|
| **Skirmish**  | 8×8      | Eliminate all enemies                 |
| **Gauntlet**  | 6×6      | Survive 5 enemy turns                 |
| **Corridor**  | 8×4      | Eliminate all (tight quarters)        |
| **Lava Pit**  | 6×6      | Eliminate all — lava tiles deal 1 HP  |
| **Boss**      | 8×8      | Eliminate all (full formation)        |

### Capture Chains (The Peglin Loop)

- Capturing an enemy piece triggers your **relics and passive effects**
- Consecutive captures build a **combo multiplier**
- Captured pieces drop gold

-----

## 🤖 Enemy AI

Enemies follow **behavior scripts** with telegraphed intents (Slay the Spire-style). The player sees what the enemy plans next turn.

```
Guard:   ADVANCE → THREATEN → ATTACK  (repeats)
Rusher:  ADVANCE → ATTACK             (fast aggressor)
Elite:   ATTACK → ADVANCE → ATTACK    (relentless)
Boss:    THREATEN → ATTACK → ADVANCE → ATTACK
```

AI actions:
- **ADVANCE** — move closest piece toward player Hero
- **THREATEN** — position to fork 2+ player pieces; falls back to ADVANCE
- **ATTACK** — capture highest-value player piece if possible; else ADVANCE

-----

## 💎 Relics

Relics are passive modifiers built on a pure-function event hook system. Every meaningful action dispatches an event; relics subscribe to specific events.

**Implemented (4):**

| Relic               | Trigger    | Effect                                                     |
|---------------------|------------|------------------------------------------------------------|
| **Blood Rogue**     | onCapture  | Gain +1 HP per capture (up to max)                        |
| **Zwischenzug**     | onCapture  | Every 3rd capture doubles the combo multiplier step        |
| **Fork**            | onLand     | If piece threatens 2+ enemies, draw an extra card          |
| **Envenomed Ranger**| onCapture  | On Ranger capture: enemies on same diagonals are poisoned  |

**Event types:** `onCapture`, `onCardPlay`, `onLand`, `onTurnStart`, `onTurnEnd`, `onPieceDeath`, `onBattleWin`

-----

## 🏗️ Starting Classes

| Class        | HP | Starting Pieces                              | Starting Relic     |
|--------------|----|----------------------------------------------|--------------------|
| **Warrior**  | 25 | Hero, Guardian×2, Brawler×2, Rogue           | Blood Rogue        |
| **Ranger**   | 20 | Hero, Ranger×2, Rogue×2, Brawler             | Envenomed Ranger   |
| **Trickster**| 18 | Hero, Rogue×3, Ranger, Witch                 | Zwischenzug        |

-----

## ⬆️ Piece Upgrades

After each fight, choose 1 of 3 random upgrades:

| Upgrade            | Piece    | Effect                                      |
|--------------------|----------|---------------------------------------------|
| **Veteran**        | Rogue    | Can also move diagonally to empty squares   |
| **Nightmare**      | Brawler  | (reserved — expanded in Phase 3)            |
| **Siege**          | Guardian | (reserved — expanded in Phase 3)            |
| **Dark Ranger**    | Ranger   | (reserved — expanded in Phase 3)            |

-----

## 📱 Screen Flow

```
MainMenu
 ├── NewRun → ClassSelect → MapScreen
 │                           ├── BattleScreen  ← core gameplay
 │                           ├── RewardScreen  (card draft + upgrade pick)
 │                           ├── ShopScreen    (buy cards / relics / upgrades)
 │                           └── RestNode      (inline heal, no screen)
 └── ContinueRun → MapScreen (if run is active)
```

-----

## 🗺️ Development Roadmap

> Status: `[ ]` Not Started &nbsp;|&nbsp; `[~]` In Progress &nbsp;|&nbsp; `[x]` Complete

-----

### Phase 1 — Core Engine `[x] COMPLETE`

**Chess Foundation**
- [x] Board Renderer — dynamic grid, piece placement, square highlighting
- [x] Legal Move Calculator — move generation for all 6 piece types
- [x] Piece State Model — position, type, team, upgrades, poisoned, hasMoved

**Battle Loop**
- [x] Card Hand System — draw 4 Move Cards per turn, play one
- [x] Turn Loop — player turn → resolve card → enemy turn → repeat
- [x] Enemy AI — 4 scripts (Guard, Rusher, Elite, Boss) with telegraphed intents

**Capture & Combo System**
- [x] Capture Detection — legal capture highlighting and piece removal
- [x] Capture Chain Tracker — consecutive capture counter + combo state
- [x] Event Dispatcher — all 7 event types wired

**Synergy Proof-of-Concept**
- [x] Relic Engine — pure-function event hooks, composable effects
- [x] 4 Relics — Blood Rogue, Zwischenzug, Fork, Envenomed Ranger

-----

### Phase 2 — Run Structure `[x] COMPLETE`

**Navigation & Screens**
- [x] Screen Navigation — MainMenu → ClassSelect → Map → Battle → Reward → Shop
- [x] Main Menu — New Run / Continue Run
- [x] Class Select — Warrior, Ranger, Trickster starting loadouts

**Map & Progression**
- [x] Map Generator — 6-row branching path, 6 node types
- [x] Act Structure — Act 1 with normal, elite, shop, rest, event, and boss nodes
- [x] Run State Model — HP, gold, deck, relics, map position persist via React Context

**Reward & Economy**
- [x] Reward Screen — card draft (pick 1 of 3 or skip for +10 gold) + upgrade pick
- [x] Shop Screen — buy Move Cards, Relics, Piece Upgrades
- [x] Piece Upgrade System — post-fight upgrade selection

**Content: Battles**
- [x] 3 Normal Formations — Skulk Patrol, Raider Band, Archer Line
- [x] 2 Elite Formations — Heavy Guard, Shadow Cell
- [x] Boss #1 — Warlord's Command (full 7-piece formation)

**Beyond original scope (added during Phase 2):**
- [x] Ability Cards — PUSH, PULL, TELEPORT, SWAP_ALLY, REPULSE (6 cards)
- [x] Variable Board Shapes — any rows×cols, dynamic cell sizing in renderer
- [x] Level Types — skirmish, gauntlet, corridor, lava_pit, boss
- [x] Win Conditions — eliminate_all, survive_turns with countdown
- [x] LAVA tile hazard — landing on lava deals 1 HP
- [x] Level objective banner + gauntlet HUD countdown
- [x] Map locked-node visual dimming

-----

### Phase 3 — Content & Depth `[ ] NOT STARTED`
*Goal: multiple viable build strategies that feel distinct across runs*

**Card Expansion**
- [ ] More card variants per piece — rare/uncommon versions of each movement effect
- [ ] Card synergy tags — metadata enabling relic interactions (e.g., `DIAGONAL`, `LEAP`, `SACRIFICE`)
- [ ] Combo-chain cards — cards that gain bonuses from consecutive captures
- [ ] Deeper ability card set — more PUSH/PULL/TELEPORT variants with unique conditions

**Relic Expansion**
- [ ] 10+ Relics total (have 4) — covering all trigger types and piece affinities
- [ ] Cross-piece relics — e.g., "whenever a Brawler captures, Ranger gets +1 move range until end of turn"
- [ ] Negative/cursed relics — high-risk high-reward relics available from events
- [ ] Document known synergy combos in-game (relic collection screen)

**Piece & Upgrade Expansion**
- [ ] Full upgrade effects — Nightmare Knight (hits L-path squares), Siege Tower (capture doesn't end turn), Dark Ranger (capture on both diagonal colors)
- [ ] Witch and Hero upgrades
- [ ] Elite upgrades — rare third-tier upgrades available from specific sources

**Mystery Events**
- [ ] Event system implementation — branching narrative choices with stat/deck consequences
- [ ] 5–8 event scripts — risk/reward scenarios (e.g., "sacrifice a piece for 3 relics")

**Acts 2 & 3**
- [ ] Act 2 enemy formations + new board layouts (wider boards, environmental hazards)
- [ ] Act 2 boss — unique behavior (e.g., spawns reinforcements, multi-phase script)
- [ ] Act 3 enemy formations
- [ ] Act 3 final boss — multi-phase with scripted transitions

**Run History**
- [ ] Run summary screen — captures, combos, relics held, turns survived, cause of death
- [ ] Persistent run history (AsyncStorage)
- [ ] Seed system — reproducible runs from a numeric seed

-----

### Phase 4 — Polish & Launch `[ ] NOT STARTED`
*Goal: shippable on iOS/Android*

**UX & Feel**
- [ ] Piece movement animations — slide/jump on board
- [ ] Capture effects — particle burst, screen flash at high combos
- [ ] Combo counter pop animation
- [ ] Sound design — capture SFX, combo escalation, UI feedback, ambient dungeon

**Balance**
- [ ] Playtesting pass — difficulty curve across all 3 acts
- [ ] Card/relic balance spreadsheet from playtest data
- [ ] Tutorial / first-run guided battle (new player onboarding)

**Technical**
- [ ] Performance audit — board rendering on low-end Android
- [ ] Persistent storage — run history, settings, unlocks
- [ ] Error boundaries + crash reporting (Sentry or equivalent)
- [ ] Colorblind mode — square color alternatives

**Distribution**
- [ ] App icon + splash screen assets
- [ ] Store screenshots and description
- [ ] TestFlight / Internal Track closed beta
- [ ] v1.0 Release — App Store + Google Play

-----

## 🧱 Tech Stack

- **Framework:** Expo / React Native (TypeScript)
- **Navigation:** Expo Router (file-based)
- **State — Battle:** `useReducer` local to battle screen
- **State — Run:** React Context (`RunContext`) with `useReducer`, wraps root layout
- **Board Logic:** Pure TypeScript engine (`src/engine/`) — zero React dependencies
- **Relic System:** Event-driven, pure functions — `dispatchEvent()` → relic `apply()` → partial state merge

-----

## 🎯 Design Pillars

| Inspiration    | Mechanic                | This Game's Version                     |
|----------------|-------------------------|-----------------------------------------|
| Balatro        | Joker synergies         | Relic + capture chain combos            |
| Balatro        | Playing cards from hand | Choosing move cards each turn           |
| Peglin         | Peg combo chains        | Consecutive captures × relic multipliers|
| Peglin         | Damage orbs             | Combo captures scaling with relics      |
| Nubby's        | Upgrade choices         | Piece upgrade selection after fights    |
| Slay the Spire | Enemy intents           | Telegraphed enemy move scripts          |
| Slay the Spire | Branching map           | Act-based run with node variety         |
