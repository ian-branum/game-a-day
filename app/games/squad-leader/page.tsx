"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameState, Unit, Pos, Phase } from "@/lib/squad-leader/types";
import {
  initGame,
  moveUnit,
  fireUnit,
  rallyUnit,
  advancePhase,
  getReachableTiles,
  getAttackableTargets,
  runAxisAI,
} from "@/lib/squad-leader/engine";
import { normandyScenario } from "@/lib/squad-leader/scenarios/normandy";

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE_SIZE = 36;

const TERRAIN_COLORS: Record<string, string> = {
  open:       "#c8b97a",
  road:       "#8b7355",
  woods:      "#2d5a1b",
  building:   "#8b6914",
  rubble:     "#6b6b6b",
  wall:       "#9b8b6b",
  wheatfield: "#d4a843",
};

const STATUS_COLORS: Record<string, string> = {
  normal:     "#22c55e",
  suppressed: "#f59e0b",
  broken:     "#ef4444",
  eliminated: "#6b7280",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SquadLeader() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [reachableTiles, setReachableTiles] = useState<Set<string>>(new Set());
  const [attackableTargets, setAttackableTargets] = useState<Set<string>>(new Set());
  const [axisActing, setAxisActing] = useState(false);
  const [axisLog, setAxisLog] = useState<string[]>([]);

  const startGame = useCallback(() => {
    const state = initGame(normandyScenario);
    setGameState(state);
    setShowBriefing(false);
  }, []);

  const restartGame = useCallback(() => {
    const state = initGame(normandyScenario);
    setGameState(state);
    setReachableTiles(new Set());
    setAttackableTargets(new Set());
  }, []);

  // Update reachable/attackable highlights when selection or phase changes
  useEffect(() => {
    if (!gameState || gameState.result !== "ongoing") return;
    if (gameState.faction !== "allied") return;

    const { activeUnit, phase } = gameState;

    if (!activeUnit) {
      setReachableTiles(new Set());
      setAttackableTargets(new Set());
      return;
    }

    if (phase === "movement") {
      const tiles = getReachableTiles(gameState, activeUnit);
      setReachableTiles(new Set(tiles.map((p) => `${p.row},${p.col}`)));
      setAttackableTargets(new Set());
    } else if (phase === "combat") {
      const targets = getAttackableTargets(gameState, activeUnit);
      setAttackableTargets(new Set(targets.map((u) => u.id)));
      setReachableTiles(new Set());
    } else {
      setReachableTiles(new Set());
      setAttackableTargets(new Set());
    }
  }, [gameState]);

  const handleTileClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.result !== "ongoing") return;
      if (gameState.faction !== "allied") return;

      const { phase, activeUnit } = gameState;

      if (phase === "movement" && activeUnit) {
        const key = `${row},${col}`;
        if (reachableTiles.has(key)) {
          const newState = moveUnit(gameState, activeUnit, { row, col });
          // Re-compute reachable after move
          const updatedReachable = getReachableTiles(newState, activeUnit);
          setReachableTiles(new Set(updatedReachable.map((p) => `${p.row},${p.col}`)));
          setGameState(newState);
          return;
        }
      }

      // Click on a unit to select it
      const unitOnTile = gameState.units.find(
        (u) => u.pos.row === row && u.pos.col === col && u.status !== "eliminated"
      );
      if (unitOnTile && unitOnTile.faction === "allied") {
        setGameState({ ...gameState, activeUnit: unitOnTile.id });
      } else {
        setGameState({ ...gameState, activeUnit: null });
      }
    },
    [gameState, reachableTiles]
  );

  const handleUnitClick = useCallback(
    (unit: Unit) => {
      if (!gameState || gameState.result !== "ongoing") return;
      if (gameState.faction !== "allied") return;
      if (unit.faction !== "allied") return;
      setGameState({ ...gameState, activeUnit: unit.id });
    },
    [gameState]
  );

  const handleFireAt = useCallback(
    (targetId: string) => {
      if (!gameState || !gameState.activeUnit) return;
      const newState = fireUnit(gameState, gameState.activeUnit, targetId);
      setGameState(newState);
    },
    [gameState]
  );

  const handleRally = useCallback(
    (unitId: string) => {
      if (!gameState) return;
      const newState = rallyUnit(gameState, unitId);
      setGameState(newState);
    },
    [gameState]
  );

  const handleEndPhase = useCallback(async () => {
    if (!gameState || gameState.result !== "ongoing") return;

    const currentPhase = gameState.phase;
    const currentFaction = gameState.faction;

    // Advance allied rally → triggers axis turn
    if (currentFaction === "allied" && currentPhase === "rally") {
      // First advance phase to switch to axis
      let nextState = advancePhase(gameState);
      setGameState({ ...nextState, activeUnit: null });
      setReachableTiles(new Set());
      setAttackableTargets(new Set());

      if (nextState.result !== "ongoing") return;

      // Run axis AI
      setAxisActing(true);
      setAxisLog([]);

      await new Promise((r) => setTimeout(r, 400));

      const beforeLog = nextState.log.slice();
      const afterState = runAxisAI(nextState);
      const newEntries = afterState.log.filter((l) => !beforeLog.includes(l));

      // Animate log entries
      for (let i = newEntries.length - 1; i >= 0; i--) {
        await new Promise((r) => setTimeout(r, 200));
        setAxisLog((prev) => [newEntries[newEntries.length - 1 - i], ...prev]);
      }

      await new Promise((r) => setTimeout(r, 600));

      // Advance from axis rally to allied movement (new turn)
      let finalState = advancePhase(afterState);
      finalState = { ...finalState, activeUnit: null };

      setAxisActing(false);
      setAxisLog([]);
      setGameState(finalState);
      return;
    }

    // Normal phase advance
    const nextState = advancePhase(gameState);
    setGameState({ ...nextState, activeUnit: null });
    setReachableTiles(new Set());
    setAttackableTargets(new Set());
  }, [gameState]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  if (showBriefing) {
    return <BriefingScreen onStart={startGame} />;
  }

  if (!gameState) return null;

  const { units, map, objectives, turn, turnsTotal, phase, faction, log, result, activeUnit, scenario } = gameState;

  const selectedUnit = activeUnit ? units.find((u) => u.id === activeUnit) ?? null : null;
  const alliedUnits = units.filter((u) => u.faction === "allied");
  const axisUnits   = units.filter((u) => u.faction === "axis");

  const phaseLabel: Record<Phase, string> = {
    movement: "MOVEMENT",
    combat:   "COMBAT",
    rally:    "RALLY",
  };

  const factionColor = faction === "allied" ? "#4488ff" : "#cc3333";
  const factionLabel = faction === "allied" ? "Allied" : "Axis";

  // ─── Game Over ─────────────────────────────────────────────────────────

  if (result !== "ongoing") {
    const isWin = result === "allied_win";
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6" style={{ background: "#05071a" }}>
        <div
          className="text-center p-8 rounded-xl max-w-md w-full"
          style={{ background: "#0a0f2e", border: `2px solid ${isWin ? "#ffd700" : "#cc3333"}` }}
        >
          <div className="text-6xl mb-4">{isWin ? "🏆" : "💀"}</div>
          <h2
            className="font-orbitron text-3xl font-black mb-2"
            style={{ color: isWin ? "#ffd700" : "#cc3333" }}
          >
            {isWin ? "VICTORY" : "DEFEAT"}
          </h2>
          <p className="text-gray-300 mb-4 text-sm leading-relaxed">
            {isWin ? scenario.alliedWinCondition : scenario.axisWinCondition}
          </p>
          <p className="text-gray-500 text-xs mb-6">
            Turn {Math.min(turn, turnsTotal)} of {turnsTotal}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
            {objectives.map((obj) => (
              <div
                key={obj.label}
                className="p-2 rounded text-center"
                style={{
                  background: obj.heldBy === "allied" ? "#4488ff22" : obj.heldBy === "axis" ? "#cc333322" : "#ffffff11",
                  border: `1px solid ${obj.heldBy === "allied" ? "#4488ff66" : obj.heldBy === "axis" ? "#cc333366" : "#ffffff22"}`,
                }}
              >
                <div style={{ color: obj.heldBy === "allied" ? "#4488ff" : obj.heldBy === "axis" ? "#cc3333" : "#888" }}>
                  {obj.heldBy === "allied" ? "🪖" : obj.heldBy === "axis" ? "🎖️" : "○"} {obj.label}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={restartGame}
            className="px-8 py-3 rounded-lg font-orbitron font-bold text-sm tracking-wider"
            style={{ background: "#ffd70022", border: "1px solid #ffd70066", color: "#ffd700" }}
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // ─── Render helpers ─────────────────────────────────────────────────────

  const unitAtPos = (row: number, col: number) =>
    units.find((u) => u.pos.row === row && u.pos.col === col && u.status !== "eliminated");

  const objAtPos = (row: number, col: number) =>
    objectives.find((o) => o.pos.row === row && o.pos.col === col);

  // ─── Main Game UI ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#05071a", color: "#e2e8f0" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "#1e2a4a", background: "#070d20" }}
      >
        <div>
          <span className="font-orbitron font-black text-lg" style={{ color: "#4488ff" }}>
            SQUAD LEADER
          </span>
          <span className="text-gray-500 text-xs ml-3">{scenario.subtitle}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span style={{ color: factionColor }} className="font-bold">
            [{factionLabel} Phase]
          </span>
          <span className="text-gray-400">
            Turn {turn}/{turnsTotal}
          </span>
          <span
            className="font-orbitron font-bold px-2 py-0.5 rounded text-xs"
            style={{ background: `${factionColor}22`, border: `1px solid ${factionColor}66`, color: factionColor }}
          >
            {phaseLabel[phase]}
          </span>
        </div>
      </div>

      {/* Objectives bar */}
      <div
        className="flex items-center gap-3 px-4 py-1.5 border-b text-xs"
        style={{ borderColor: "#1e2a4a", background: "#060b1a" }}
      >
        <span className="text-gray-500 font-orbitron text-xs">OBJECTIVES:</span>
        {objectives.map((obj) => (
          <span
            key={obj.label}
            className="px-2 py-0.5 rounded font-bold"
            style={{
              background: obj.heldBy === "allied" ? "#4488ff22" : obj.heldBy === "axis" ? "#cc333322" : "#ffffff11",
              border: `1px solid ${obj.heldBy === "allied" ? "#4488ff66" : obj.heldBy === "axis" ? "#cc333366" : "#ffffff22"}`,
              color: obj.heldBy === "allied" ? "#4488ff" : obj.heldBy === "axis" ? "#cc3333" : "#888",
            }}
          >
            {obj.label} {obj.heldBy === "allied" ? "🪖" : obj.heldBy === "axis" ? "🎖️" : "○"}
          </span>
        ))}
        <span className="ml-auto text-gray-500">
          Need {scenario.alliedObjectivesNeeded}/3 to win
        </span>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 overflow-auto p-2">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${map[0]?.length ?? 16}, ${TILE_SIZE}px)`,
              gridTemplateRows: `repeat(${map.length}, ${TILE_SIZE}px)`,
              gap: 0,
              width: "fit-content",
            }}
          >
            {map.map((row, r) =>
              row.map((tile, c) => {
                const unit = unitAtPos(r, c);
                const obj = objAtPos(r, c);
                const posKey = `${r},${c}`;
                const isReachable = reachableTiles.has(posKey);
                const isSelected =
                  selectedUnit?.pos.row === r && selectedUnit?.pos.col === c;
                const isAttackableTarget =
                  unit && attackableTargets.has(unit.id);

                let borderColor = "transparent";
                let borderWidth = "1px";
                if (isSelected) { borderColor = "#ffffff"; borderWidth = "2px"; }
                else if (isReachable) { borderColor = "#4488ff"; borderWidth = "2px"; }
                else if (isAttackableTarget) { borderColor = "#ef4444"; borderWidth = "2px"; }
                else if (obj) { borderColor = "#ffd70066"; borderWidth = "1px"; }
                else { borderColor = "#00000033"; borderWidth = "1px"; }

                const bgColor = isReachable
                  ? mixColor(TERRAIN_COLORS[tile.terrain] ?? "#888", "#4488ff", 0.25)
                  : TERRAIN_COLORS[tile.terrain] ?? "#888";

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleTileClick(r, c)}
                    className={obj ? "animate-pulse" : ""}
                    style={{
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      background: bgColor,
                      border: `${borderWidth} solid ${borderColor}`,
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      boxShadow: isSelected ? "inset 0 0 6px #ffffff88" : isAttackableTarget ? "inset 0 0 6px #ef444488" : "none",
                    }}
                  >
                    {/* Terrain indicator for buildings */}
                    {tile.terrain === "building" && !unit && (
                      <span style={{ fontSize: "12px", opacity: 0.7 }}>🏠</span>
                    )}
                    {tile.terrain === "woods" && !unit && (
                      <span style={{ fontSize: "10px", opacity: 0.5 }}>🌲</span>
                    )}
                    {/* Objective marker */}
                    {obj && !unit && (
                      <span style={{ fontSize: "12px" }}>⭐</span>
                    )}
                    {/* Unit */}
                    {unit && (
                      <div
                        title={`${unit.name} (${unit.faction}) — ${unit.status}`}
                        style={{
                          fontSize: "18px",
                          filter: unit.status === "eliminated"
                            ? "grayscale(1) opacity(0.3)"
                            : unit.status === "broken"
                            ? "hue-rotate(0deg) saturate(0.5)"
                            : "none",
                          textShadow: unit.faction === "allied"
                            ? "0 0 6px #4488ff"
                            : "0 0 6px #cc3333",
                        }}
                      >
                        {unit.emoji}
                      </div>
                    )}
                    {/* Status pip */}
                    {unit && unit.status !== "normal" && unit.status !== "eliminated" && (
                      <div
                        style={{
                          position: "absolute",
                          top: 1,
                          right: 1,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: STATUS_COLORS[unit.status],
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel */}
        <div
          className="w-56 flex-shrink-0 flex flex-col border-l overflow-y-auto"
          style={{ borderColor: "#1e2a4a", background: "#060b1a" }}
        >
          {/* Selected unit */}
          {selectedUnit ? (
            <div className="p-3 border-b" style={{ borderColor: "#1e2a4a" }}>
              <div className="text-center mb-2">
                <span style={{ fontSize: "28px" }}>{selectedUnit.emoji}</span>
              </div>
              <div className="font-bold text-sm text-center mb-1">{selectedUnit.name}</div>
              <div className="text-center mb-2">
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold"
                  style={{
                    background: `${STATUS_COLORS[selectedUnit.status]}22`,
                    border: `1px solid ${STATUS_COLORS[selectedUnit.status]}66`,
                    color: STATUS_COLORS[selectedUnit.status],
                  }}
                >
                  {selectedUnit.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                <div>ATK: <span className="text-white">{selectedUnit.attack}</span></div>
                <div>DEF: <span className="text-white">{selectedUnit.defense}</span></div>
                <div>MOV: <span className="text-white">{selectedUnit.movement - selectedUnit.mpUsed}/{selectedUnit.movement}</span></div>
                <div>RNG: <span className="text-white">{selectedUnit.range}</span></div>
                <div>MRL: <span className="text-white">{selectedUnit.morale}</span></div>
                <div>FIRE: <span className={selectedUnit.hasFired ? "text-red-400" : "text-green-400"}>{selectedUnit.hasFired ? "SPENT" : "READY"}</span></div>
              </div>

              {/* Actions */}
              <div className="mt-3 space-y-1">
                {phase === "combat" && !selectedUnit.hasFired && selectedUnit.status !== "eliminated" && (
                  <>
                    {getAttackableTargets(gameState, selectedUnit.id).map((target) => (
                      <button
                        key={target.id}
                        onClick={() => handleFireAt(target.id)}
                        className="w-full text-left px-2 py-1 rounded text-xs transition"
                        style={{
                          background: "#cc333322",
                          border: "1px solid #cc333366",
                          color: "#ff8888",
                        }}
                      >
                        🎯 Fire: {target.emoji} {target.name}
                      </button>
                    ))}
                    {getAttackableTargets(gameState, selectedUnit.id).length === 0 && (
                      <p className="text-gray-600 text-xs text-center">No targets in range</p>
                    )}
                  </>
                )}
                {phase === "rally" && (selectedUnit.status === "broken" || selectedUnit.status === "suppressed") && (
                  <button
                    onClick={() => handleRally(selectedUnit.id)}
                    className="w-full px-2 py-1 rounded text-xs transition"
                    style={{ background: "#22c55e22", border: "1px solid #22c55e66", color: "#22c55e" }}
                  >
                    🔄 Rally
                  </button>
                )}
              </div>

              <button
                onClick={() => setGameState({ ...gameState, activeUnit: null })}
                className="w-full mt-2 text-xs text-gray-600 hover:text-gray-400"
              >
                Deselect
              </button>
            </div>
          ) : (
            <div className="p-3 border-b text-center text-gray-600 text-xs" style={{ borderColor: "#1e2a4a" }}>
              Click a unit to select
            </div>
          )}

          {/* Phase-specific rally list */}
          {phase === "rally" && faction === "allied" && (
            <div className="p-2 border-b" style={{ borderColor: "#1e2a4a" }}>
              <div className="text-xs text-gray-500 mb-1 font-orbitron">RALLY</div>
              {alliedUnits
                .filter((u) => u.status === "broken" || u.status === "suppressed")
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleRally(u.id)}
                    className="w-full text-left px-2 py-1 rounded text-xs mb-1 transition"
                    style={{ background: "#22c55e22", border: "1px solid #22c55e66", color: "#22c55e" }}
                  >
                    🔄 {u.emoji} {u.name}
                    <span className="ml-1" style={{ color: STATUS_COLORS[u.status] }}>
                      [{u.status}]
                    </span>
                  </button>
                ))}
              {alliedUnits.filter((u) => u.status === "broken" || u.status === "suppressed").length === 0 && (
                <p className="text-xs text-gray-600">All units nominal</p>
              )}
            </div>
          )}

          {/* Unit roster */}
          <div className="p-2 flex-1">
            <div className="text-xs text-gray-500 mb-1 font-orbitron" style={{ color: "#4488ff88" }}>ALLIED</div>
            {alliedUnits.map((u) => (
              <div
                key={u.id}
                onClick={() => u.status !== "eliminated" && handleUnitClick(u)}
                className="flex items-center gap-1 px-1 py-0.5 rounded mb-0.5 cursor-pointer transition"
                style={{
                  background: activeUnit === u.id ? "#4488ff22" : "transparent",
                  border: activeUnit === u.id ? "1px solid #4488ff44" : "1px solid transparent",
                  opacity: u.status === "eliminated" ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: "12px" }}>{u.emoji}</span>
                <span className="text-xs flex-1 truncate">{u.name}</span>
                <span style={{ fontSize: "8px", color: STATUS_COLORS[u.status], fontWeight: "bold" }}>
                  {u.status === "normal" ? "●" : u.status === "suppressed" ? "S" : u.status === "broken" ? "B" : "✕"}
                </span>
              </div>
            ))}

            <div className="text-xs mt-3 mb-1 font-orbitron" style={{ color: "#cc333388" }}>AXIS</div>
            {axisUnits.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-1 px-1 py-0.5 rounded mb-0.5"
                style={{ opacity: u.status === "eliminated" ? 0.4 : 1 }}
              >
                <span style={{ fontSize: "12px" }}>{u.emoji}</span>
                <span className="text-xs flex-1 truncate">{u.name}</span>
                <span style={{ fontSize: "8px", color: STATUS_COLORS[u.status], fontWeight: "bold" }}>
                  {u.status === "normal" ? "●" : u.status === "suppressed" ? "S" : u.status === "broken" ? "B" : "✕"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: combat log + end phase */}
      <div
        className="border-t flex items-end gap-3 px-4 py-2"
        style={{ borderColor: "#1e2a4a", background: "#060b1a", minHeight: "90px" }}
      >
        <div className="flex-1 font-mono text-xs space-y-0.5">
          {log.slice(0, 4).map((entry, i) => (
            <div
              key={i}
              style={{
                color: i === 0 ? "#e2e8f0" : "#6b7280",
                fontWeight: i === 0 ? "bold" : "normal",
              }}
            >
              {i === 0 ? "▶ " : "  "}{entry}
            </div>
          ))}
        </div>
        <div className="flex-shrink-0">
          {faction === "allied" && !axisActing && (
            <button
              onClick={handleEndPhase}
              className="px-4 py-2 rounded-lg font-orbitron font-bold text-xs tracking-wider transition"
              style={{
                background: "#4488ff22",
                border: "1px solid #4488ff66",
                color: "#4488ff",
              }}
            >
              End {phaseLabel[phase]}
              {phase === "rally" ? " →\nAxis Turn" : ""}
            </button>
          )}
          {axisActing && (
            <div
              className="px-4 py-2 rounded-lg font-orbitron font-bold text-xs text-center"
              style={{ background: "#cc333322", border: "1px solid #cc333366", color: "#cc3333", minWidth: "120px" }}
            >
              <div className="animate-pulse">Axis Acting...</div>
              <div className="mt-1 space-y-0.5">
                {axisLog.slice(0, 3).map((l, i) => (
                  <div key={i} className="text-gray-400 font-normal text-xs truncate max-w-[140px]">{l}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Axis acting overlay */}
      {axisActing && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div
            className="p-6 rounded-xl font-orbitron text-center"
            style={{ background: "#0a0f2e", border: "2px solid #cc3333", color: "#cc3333", pointerEvents: "none" }}
          >
            <div className="animate-pulse text-lg font-black mb-2">AXIS TURN</div>
            <div className="text-xs text-gray-400 space-y-1">
              {axisLog.slice(0, 5).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Briefing Screen ──────────────────────────────────────────────────────────

function BriefingScreen({ onStart }: { onStart: () => void }) {
  const scenario = normandyScenario;

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 overflow-y-auto" style={{ background: "#05071a" }}>
      <div
        className="max-w-xl w-full rounded-xl overflow-hidden"
        style={{ border: "2px solid #4488ff44", background: "#070d20" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 text-center"
          style={{ background: "#0a1440", borderBottom: "1px solid #1e2a4a" }}
        >
          <div className="font-orbitron text-xs text-gray-500 mb-1 tracking-widest">OPERATION BRIEFING</div>
          <h1 className="font-orbitron text-2xl font-black mb-1" style={{ color: "#ffd700" }}>
            {scenario.title}
          </h1>
          <p className="text-gray-400 text-sm">{scenario.subtitle}</p>
        </div>

        {/* Briefing text */}
        <div className="px-6 py-4 border-b text-sm leading-relaxed text-gray-300 whitespace-pre-line" style={{ borderColor: "#1e2a4a" }}>
          {scenario.briefing}
        </div>

        {/* Unit rosters */}
        <div className="grid grid-cols-2 gap-0 border-b" style={{ borderColor: "#1e2a4a" }}>
          <div className="p-4 border-r" style={{ borderColor: "#1e2a4a" }}>
            <div className="font-orbitron text-xs mb-2" style={{ color: "#4488ff" }}>🪖 ALLIED FORCES</div>
            {scenario.units.filter((u) => u.faction === "allied").map((u) => (
              <div key={u.id} className="text-xs text-gray-400 mb-0.5">
                {u.emoji} {u.name} <span className="text-gray-600">ATK:{u.attack}</span>
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="font-orbitron text-xs mb-2" style={{ color: "#cc3333" }}>🎖️ AXIS FORCES</div>
            {scenario.units.filter((u) => u.faction === "axis").map((u) => (
              <div key={u.id} className="text-xs text-gray-400 mb-0.5">
                {u.emoji} {u.name} <span className="text-gray-600">ATK:{u.attack}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Win conditions */}
        <div className="p-4 border-b" style={{ borderColor: "#1e2a4a" }}>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-orbitron mb-1" style={{ color: "#4488ff" }}>ALLIED WIN</div>
              <p className="text-gray-400">{scenario.alliedWinCondition}</p>
            </div>
            <div>
              <div className="font-orbitron mb-1" style={{ color: "#cc3333" }}>AXIS WIN</div>
              <p className="text-gray-400">{scenario.axisWinCondition}</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            🏆 Hold <span className="text-yellow-400 font-bold">{scenario.alliedObjectivesNeeded} of 3</span> objectives by turn {scenario.turnsTotal} · {scenario.turnsTotal} turns total
          </div>
        </div>

        {/* Objectives */}
        <div className="px-6 py-3 border-b" style={{ borderColor: "#1e2a4a" }}>
          <div className="font-orbitron text-xs mb-2" style={{ color: "#ffd700" }}>📍 OBJECTIVES</div>
          <div className="flex gap-3">
            {scenario.objectives.map((o) => (
              <div
                key={o.label}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#ffd70011", border: "1px solid #ffd70033", color: "#ffd700" }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>

        {/* Start */}
        <div className="p-6 text-center">
          <button
            onClick={onStart}
            className="px-10 py-3 rounded-lg font-orbitron font-black text-base tracking-widest transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #4488ff22, #4488ff44)",
              border: "2px solid #4488ff",
              color: "#4488ff",
              boxShadow: "0 0 20px #4488ff44",
            }}
          >
            BEGIN MISSION
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function mixColor(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return [r, g, b];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const b = Math.round(b1 * (1 - t) + b2 * t);
  return `rgb(${r},${g},${b})`;
}
