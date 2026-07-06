# Task Brief: Squad Leader Engine + "Clear the Village" Scenario

## Overview

Build a turn-based tactical wargame inspired by Squad Leader, playable in the browser. The architecture has two layers:

1. **Engine** (`lib/squad-leader/`) — reusable, scenario-agnostic game logic
2. **Scenario** (`lib/squad-leader/scenarios/normandy.ts`) — pure data defining this specific battle
3. **Page** (`app/games/squad-leader/page.tsx`) — React UI that wires engine + scenario together

The engine must be designed so a future scenario can be dropped in by passing a different `ScenarioDefinition` object.

---

## Files to Create

```
lib/squad-leader/
  types.ts              ← all shared types/interfaces
  engine.ts             ← pure game logic (no React, no DOM)
  los.ts                ← line-of-sight calculations
  scenarios/
    normandy.ts         ← "Clear the Village" scenario definition

app/games/squad-leader/
  page.tsx              ← React UI
  TASK.md               ← this file (already exists)
```

---

## ENGINE: `lib/squad-leader/types.ts`

```ts
// Terrain types — affects movement cost and cover
export type TerrainType =
  | "open"        // no cover, 1 MP
  | "road"        // no cover, 0.5 MP (fast movement)
  | "woods"       // +2 defense, 2 MP, blocks LOS beyond 2 tiles
  | "building"    // +3 defense, 2 MP, blocks LOS
  | "rubble"      // +1 defense, 2 MP
  | "wall"        // +1 defense, 1 MP, partial LOS block
  | "wheatfield"; // +1 defense, 1 MP, blocks LOS beyond 3 tiles

export type Faction = "allied" | "axis";
export type UnitType = "infantry" | "leader" | "mg" | "mortar" | "vehicle";
export type UnitStatus = "normal" | "suppressed" | "broken" | "eliminated";
export type Phase = "movement" | "combat" | "rally";
export type GameResult = "ongoing" | "allied_win" | "axis_win" | "draw";

export interface Pos {
  row: number;
  col: number;
}

export interface Unit {
  id: string;
  name: string;          // e.g. "1st Squad", "MG42 Team"
  faction: Faction;
  type: UnitType;
  attack: number;        // firepower rating
  defense: number;       // base defense modifier
  movement: number;      // movement points per turn
  range: number;         // attack range in tiles
  morale: number;        // 1–10; below 3 = broken
  pos: Pos;
  status: UnitStatus;
  mpUsed: number;        // movement points spent this turn
  hasFired: boolean;     // fired this turn
  emoji: string;         // display icon
}

export interface Tile {
  terrain: TerrainType;
  objective?: boolean;   // capture-point tile
  objectiveHeldBy?: Faction | null;
}

export type GameMap = Tile[][];

export interface ObjectiveState {
  pos: Pos;
  heldBy: Faction | null;
  label: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  subtitle: string;
  briefing: string;           // flavor text shown before game starts
  map: GameMap;
  units: Omit<Unit, "mpUsed" | "hasFired" | "status">[];
  objectives: { pos: Pos; label: string }[];
  turnsTotal: number;
  alliedWinCondition: string; // human-readable
  axisWinCondition: string;
  // Win logic: allied wins if they hold >= alliedObjectivesNeeded objectives at end
  alliedObjectivesNeeded: number;
}

export interface GameState {
  map: GameMap;
  units: Unit[];
  objectives: ObjectiveState[];
  turn: number;
  turnsTotal: number;
  phase: Phase;
  activeUnit: string | null;   // id of selected unit
  faction: Faction;            // whose turn it is (allied always goes first)
  log: string[];               // combat log, newest first
  result: GameResult;
  scenario: ScenarioDefinition;
}
```

---

## ENGINE: `lib/squad-leader/los.ts`

Line of sight — pure functions, no side effects.

```ts
// Returns true if unit at `from` can see tile at `to` given the map
export function hasLOS(map: GameMap, from: Pos, to: Pos): boolean
```

**LOS rules:**
- Walk the Bresenham line from `from` to `to`
- For each intermediate tile (not source, not target):
  - `building` → always blocks
  - `woods` → blocks if the path has traversed more than 2 wood tiles in a row
  - `wheatfield` → blocks if the path has traversed more than 3 wheatfield tiles
  - `wall` → does not block LOS (only provides cover)
- Source and destination tiles do not block LOS
- Export a helper: `bresenham(from: Pos, to: Pos): Pos[]` (returns intermediate tiles)

---

## ENGINE: `lib/squad-leader/engine.ts`

Pure functions — no React, no side effects, no mutation (return new state). This makes it testable and reusable.

### Initialization

```ts
export function initGame(scenario: ScenarioDefinition): GameState
```

- Deep-copy map and units from scenario
- Set all units: `status: "normal"`, `mpUsed: 0`, `hasFired: false`
- Build objectives array from scenario.objectives
- Set `turn: 1`, `phase: "movement"`, `faction: "allied"`
- Mark objective tiles as `objective: true` on the map

### Movement

```ts
export function moveUnit(state: GameState, unitId: string, to: Pos): GameState
// Returns state unchanged (with log entry) if move is illegal
```

**Rules:**
- Only during `phase: "movement"`
- Only units belonging to current `faction` may move
- `status: "broken"` units may only move away from nearest enemy (flee logic: toward own map edge)
- `status: "suppressed"` units spend +1 MP per tile (penalty)
- `status: "eliminated"` units cannot move
- Calculate path cost: sum terrain MP costs along any path (A* or simple greedy is fine)
- Cannot move through enemy-occupied tiles
- Cannot exceed `unit.movement - unit.mpUsed` remaining MP
- After move: update `unit.pos`, `unit.mpUsed`
- After move: if unit is on an objective tile, update `objectiveHeldBy`

### Combat

```ts
export function fireUnit(state: GameState, attackerId: string, targetId: string): GameState
```

**Rules:**
- Only during `phase: "combat"`
- Only attacker's faction's turn
- Attacker must not have `hasFired: true`
- Target must be within `attacker.range` tiles (Chebyshev distance)
- Must have LOS (call `hasLOS`)
- **Attack roll:** `Math.random() * 10 + attacker.attack`
- **Defense value:** `target.defense + terrainDefenseBonus(map, target.pos) + (target.status === "suppressed" ? -1 : 0)`
- **Resolution:**
  - Roll > defense + 4 → target eliminated
  - Roll > defense + 2 → target broken (morale = 2, status = "broken")
  - Roll > defense → target suppressed (status = "suppressed")
  - Roll ≤ defense → miss
- Leaders within 2 tiles of a friendly unit add +1 to that unit's attack
- After firing: set `hasFired: true`
- Add a descriptive log entry (e.g. "1st Squad fires at MG42 Team → SUPPRESSED")

Helper:
```ts
function terrainDefenseBonus(map: GameMap, pos: Pos): number
// open: 0, road: 0, wall: +1, rubble: +1, wheatfield: +1, woods: +2, building: +3
```

### Rally

```ts
export function rallyUnit(state: GameState, unitId: string): GameState
```

- Only during `phase: "rally"`
- Only for `status: "broken"` or `status: "suppressed"` units
- `status: "suppressed"` → always rallies to `"normal"`
- `status: "broken"` → roll `Math.random() * 10`; if > (10 - unit.morale) → rally to `"normal"`, else stays broken
- Leader within 2 tiles adds +2 to rally roll

### Phase Advancement

```ts
export function advancePhase(state: GameState): GameState
```

Cycle: movement → combat → rally → (switch faction) → movement → ...

- After axis rally phase completes: increment `turn`, check win conditions
- Reset `mpUsed: 0`, `hasFired: false` for all units of the faction that just finished
- **Win check** (call after turn increment):
  - Allied holds `>= scenario.alliedObjectivesNeeded` objectives → `allied_win`
  - Turn exceeds `turnsTotal` → count held objectives → most wins; tie → `axis_win` (defender wins ties)
  - All allied units eliminated → `axis_win`
  - All axis units eliminated → `allied_win`

### AI (Axis turn)

```ts
export function runAxisAI(state: GameState): GameState
```

Simple rule-based AI — no LLM needed:

**Movement phase:**
- Each axis unit: if not broken, move toward nearest objective not held by axis (or toward nearest allied unit if all objectives held)
- Broken units: move away from nearest allied unit

**Combat phase:**
- Each axis unit: find all allied units in range + LOS; fire at the one with lowest defense+terrain bonus

**Rally phase:**
- Auto-rally all eligible axis units

The AI should make decisions sequentially for each unit, returning the final state after all units have acted.

---

## SCENARIO: `lib/squad-leader/scenarios/normandy.ts`

**"Clear the Village" — Normandy, June 1944**

A small French village. American 101st Airborne troops must clear out German infantry holding three key buildings before nightfall (10 turns).

### Map: 12 rows × 16 cols

Design a map with:
- A dirt road running roughly east-west across the middle
- 3–4 building clusters (the "village") in the center and right side
- Woods patches on the top-left (Allied approach) and bottom-right corners
- Open fields between woods and village (dangerous crossing)
- Wheatfields along the bottom edge
- A stone wall running along the road on one side

Encode as a 12×16 array of `Tile` objects. Be deliberate — the map should create interesting tactical choices (use the woods for cover, exposed road crossing, building-to-building fighting).

### Units

**Allied (bottom-left approach):**
```
{ id: "a1", name: "1st Squad",     faction: "allied", type: "infantry", attack: 4, defense: 2, movement: 4, range: 4, morale: 8, pos: {row:10,col:0}, emoji: "🪖" }
{ id: "a2", name: "2nd Squad",     faction: "allied", type: "infantry", attack: 4, defense: 2, movement: 4, range: 4, morale: 8, pos: {row:11,col:1}, emoji: "🪖" }
{ id: "a3", name: "3rd Squad",     faction: "allied", type: "infantry", attack: 4, defense: 2, movement: 4, range: 4, morale: 7, pos: {row:9, col:0}, emoji: "🪖" }
{ id: "a4", name: "Lt. Miller",    faction: "allied", type: "leader",   attack: 3, defense: 2, movement: 5, range: 3, morale: 9, pos: {row:10,col:1}, emoji: "⭐" }
{ id: "a5", name: "BAR Team",      faction: "allied", type: "mg",       attack: 6, defense: 2, movement: 3, range: 6, morale: 8, pos: {row:11,col:0}, emoji: "🔫" }
```

**Axis (defending village center/right):**
```
{ id: "g1", name: "1st Gruppe",    faction: "axis",   type: "infantry", attack: 4, defense: 3, movement: 3, range: 4, morale: 7, pos: {row:5, col:9}, emoji: "🎖️" }
{ id: "g2", name: "2nd Gruppe",    faction: "axis",   type: "infantry", attack: 4, defense: 3, movement: 3, range: 4, morale: 7, pos: {row:6,col:11}, emoji: "🎖️" }
{ id: "g3", name: "3rd Gruppe",    faction: "axis",   type: "infantry", attack: 4, defense: 3, movement: 3, range: 4, morale: 6, pos: {row:4,col:13}, emoji: "🎖️" }
{ id: "g4", name: "MG42 Team",     faction: "axis",   type: "mg",       attack: 7, defense: 3, movement: 2, range: 7, morale: 8, pos: {row:5,col:12}, emoji: "💀" }
{ id: "g5", name: "Feldwebel Krause", faction: "axis", type: "leader", attack: 3, defense: 3, movement: 3, range: 3, morale: 9, pos: {row:5,col:11}, emoji: "🎖️" }
```

### Objectives (3 building tiles in the village)

```
{ pos: {row:5, col:9},  label: "Farmhouse" }       // initially held by axis (g1 is here)
{ pos: {row:4, col:12}, label: "Church" }            // initially axis
{ pos: {row:6, col:14}, label: "Mayor's House" }     // initially axis
```

### Win Conditions

- `turnsTotal: 10`
- `alliedObjectivesNeeded: 2` (hold 2 of 3 objectives at end of any turn, or all axis eliminated)
- Allied win string: "The Airborne clears the village before dawn. Mission accomplished."
- Axis win string: "The German defenders hold long enough. Reinforcements are coming."

---

## UI: `app/games/squad-leader/page.tsx`

### Layout

```
┌─────────────────────────────────────┐
│  TITLE + Turn/Phase indicator        │
│  [Allied Phase] Turn 3/10 MOVEMENT  │
├──────────────────────┬──────────────┤
│                      │ Unit Panel   │
│   MAP GRID           │ (selected)   │
│   (scrollable)       │              │
│                      │ Action Btns  │
├──────────────────────┴──────────────┤
│  Combat Log (last 4 lines)          │
│  [End Phase] button                 │
└─────────────────────────────────────┘
```

### Map Rendering

- Each tile: 36×36px div (or 32px on mobile), rendered as a CSS grid
- Terrain colors:
  - `open`: `#c8b97a` (tan)
  - `road`: `#8b7355` (brown)
  - `woods`: `#2d5a1b` (dark green)
  - `building`: `#8b6914` (ochre) with a small house outline
  - `rubble`: `#6b6b6b` (grey)
  - `wall`: `#9b8b6b` (light brown) with border emphasis
  - `wheatfield`: `#d4a843` (golden)
- Objective tiles: pulsing border (`animate-pulse` Tailwind class) in gold
- Selected unit: bright white border on its tile
- Units in range + LOS during combat phase: red-tinted border (attackable targets)
- Movement range during movement phase: blue-tinted tile highlight

### Unit Panel (right sidebar)

When a unit is selected, show:
- Name, emoji, faction
- Status badge (color-coded: green=normal, yellow=suppressed, red=broken, grey=eliminated)
- Stats: ATK / DEF / MOV / RNG / Morale
- Available actions as buttons:
  - Movement phase: clickable map tiles for movement (highlight reachable tiles in blue)
  - Combat phase: "Fire at [enemy]" buttons for each enemy in range+LOS
  - Rally phase: "Rally" button if broken/suppressed

### Interaction Flow

**Movement phase (player controls Allied):**
1. Click a unit → highlight it + show blue reachable tiles
2. Click a blue tile → move the unit
3. Click another unit or "Deselect"
4. "End Movement Phase" button → advance to combat

**Combat phase:**
1. Click a unit that hasn't fired → show red-highlighted enemy targets
2. Click "Fire" on a target in the panel → resolve combat, log result
3. "End Combat Phase" button → advance to rally

**Rally phase:**
1. Any broken/suppressed Allied units shown with "Rally" button
2. "End Rally Phase" → trigger axis AI for all three phases → advance turn

### Axis AI Turn

After Allied rally phase ends:
1. Show "Axis is acting..." overlay with brief delay (800ms per unit action) to make it feel deliberate
2. Run `runAxisAI(state)` — this returns the final state after all axis actions
3. Animate the log entries appearing one by one (200ms apart) so player can follow what happened
4. Then it's Allied turn again

### Briefing Screen

Before game starts, show a modal/overlay with:
- Scenario title + subtitle
- Map of Europe thumbnail (just flavor text is fine, no actual image needed)
- `scenario.briefing` text
- Unit roster summary (allied vs axis)
- Win conditions
- "BEGIN MISSION" button

### Game Over Screen

When `state.result !== "ongoing"`:
- Full-screen overlay
- Win/loss message
- Final turn count
- "Play Again" button (re-inits the same scenario)

---

## Visual Style

Follow existing game aesthetic:
- Background: `#05071a` (deep dark)
- Font: `font-orbitron` for headers, system font for body/log text
- Allied color: `#4488ff` (blue)
- Axis color: `#cc3333` (red)
- Objective highlight: `#ffd700` (gold)
- Status colors: normal=`#22c55e`, suppressed=`#f59e0b`, broken=`#ef4444`, eliminated=`#6b7280`
- Combat log: monospace font, dark panel, newest entry highlighted briefly

---

## State Management

- All game state in a single `useState<GameState>()`
- Engine functions are pure — they take state and return new state
- No useRef needed for game logic (turn-based, not real-time)
- Keep the React component thin: it renders state and calls engine functions on user events

---

## Important Notes

- **NO AI API calls** — the axis AI is pure rule-based logic in `engine.ts`
- TypeScript strict — no `any`
- The engine (`lib/squad-leader/`) must have zero React imports
- The page imports from `@/lib/squad-leader/engine`, `@/lib/squad-leader/types`, `@/lib/squad-leader/scenarios/normandy`
- Do NOT touch `lib/games.ts` — Chef handles registry
- Map must be scrollable on mobile (overflow-x: auto on the map container)

---

## Reference Files

- Style: `app/games/snake/page.tsx`
- Layout: `app/games/layout.tsx`
- Types pattern: `lib/games.ts`
