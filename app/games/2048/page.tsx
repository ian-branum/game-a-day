"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ThinkingOrbs from "@/components/ThinkingOrbs";

type Board = number[][];
type Direction = "up" | "down" | "left" | "right";

// ─── Board logic ──────────────────────────────────────────────────────────────

function emptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandomTile(board: Board): Board {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const tiles = row.filter((v) => v !== 0);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function applyMove(board: Board, dir: Direction): { board: Board; score: number; moved: boolean } {
  let rotated = board;

  // Rotate so we always slide left, then rotate back
  if (dir === "right") rotated = board.map((row) => [...row].reverse());
  else if (dir === "up") rotated = [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => board[r][c]));
  else if (dir === "down") rotated = [0, 1, 2, 3].map((c) => [3, 2, 1, 0].map((r) => board[r][c]));

  let totalScore = 0;
  let moved = false;
  const result = rotated.map((row) => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    if (!moved && newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });

  let final = result;
  if (dir === "right") final = result.map((row) => [...row].reverse());
  else if (dir === "up") final = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => result[c][r]));
  else if (dir === "down") final = [0, 1, 2, 3].map((r) => [3, 2, 1, 0].map((c) => result[c][r]));

  return { board: final, score: totalScore, moved };
}

function hasValidMoves(board: Board): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  return false;
}

function initGame(): { board: Board; score: number } {
  let b = emptyBoard();
  b = addRandomTile(b);
  b = addRandomTile(b);
  return { board: b, score: 0 };
}

// ─── Tile colours ─────────────────────────────────────────────────────────────

const TILE_STYLE: Record<number, { bg: string; color: string; glow?: string }> = {
  0:    { bg: "#0d0d2b",  color: "transparent" },
  2:    { bg: "#1e1b4b",  color: "#c7d2fe" },
  4:    { bg: "#312e81",  color: "#c7d2fe" },
  8:    { bg: "#1e3a8a",  color: "#93c5fd" },
  16:   { bg: "#1d4ed8",  color: "#bfdbfe", glow: "#3b82f644" },
  32:   { bg: "#7c3aed",  color: "#ddd6fe", glow: "#8b5cf644" },
  64:   { bg: "#9333ea",  color: "#f5d0fe", glow: "#a855f755" },
  128:  { bg: "#be185d",  color: "#fce7f3", glow: "#ec489955" },
  256:  { bg: "#e11d48",  color: "#fff1f2", glow: "#f4436566" },
  512:  { bg: "#ea580c",  color: "#fff7ed", glow: "#f9731677" },
  1024: { bg: "#ca8a04",  color: "#fefce8", glow: "#eab30888" },
  2048: { bg: "#16a34a",  color: "#f0fdf4", glow: "#22c55e99" },
};

function tileStyle(val: number): { bg: string; color: string; glow?: string } {
  return TILE_STYLE[val] ?? { bg: "#166534", color: "#dcfce7", glow: "#4ade8099" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Game2048() {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [mode, setMode] = useState<"human" | "ai">("human");
  const [thinking, setThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [started, setStarted] = useState(false);
  const aiLoopRef = useRef(false);
  const boardRef = useRef<Board>(board);
  const scoreRef = useRef<number>(score);

  boardRef.current = board;
  scoreRef.current = score;

  const applyDirection = useCallback((dir: Direction, currentBoard: Board, currentScore: number) => {
    const { board: next, score: gained, moved } = applyMove(currentBoard, dir);
    if (!moved) return { board: currentBoard, score: currentScore, moved: false };
    const withTile = addRandomTile(next);
    const newScore = currentScore + gained;
    if (newScore > best) setBest(newScore);
    return { board: withTile, score: newScore, moved: true };
  }, [best]);

  const startGame = useCallback(() => {
    const { board: b, score: s } = initGame();
    setBoard(b);
    setScore(s);
    setWon(false);
    setGameOver(false);
    setStarted(true);
    aiLoopRef.current = false;
  }, []);

  // Human keyboard control
  useEffect(() => {
    if (mode !== "human" || !started) return;
    const handler = (e: KeyboardEvent) => {
      if (gameOver || won) return;
      const dir: Direction | null =
        e.key === "ArrowUp" ? "up" :
        e.key === "ArrowDown" ? "down" :
        e.key === "ArrowLeft" ? "left" :
        e.key === "ArrowRight" ? "right" : null;
      if (!dir) return;
      e.preventDefault();
      setBoard((prev) => {
        const { board: next, score: gained, moved } = applyMove(prev, dir);
        if (!moved) return prev;
        const withTile = addRandomTile(next);
        setScore((s) => {
          const ns = s + gained;
          setBest((b) => Math.max(b, ns));
          return ns;
        });
        if (withTile.some((r) => r.includes(2048))) setWon(true);
        if (!hasValidMoves(withTile)) setGameOver(true);
        return withTile;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, started, gameOver, won]);

  // AI loop
  const runAITurn = useCallback(async () => {
    if (!aiLoopRef.current) return;
    setThinking(true);
    const currentBoard = boardRef.current;
    const boardDesc = currentBoard.map((r, i) =>
      r.map((v, j) => `[${i},${j}]:${v}`).join(", ")
    ).join(" | ");

    const prompt = `Current board state (row,col:value): ${boardDesc}. Score: ${scoreRef.current}. Choose the best direction to move.`;

    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "",
        },
        body: JSON.stringify({ prompt, game: "2048" }),
      });
      const data = await res.json();
      const raw = (data.response || "").toLowerCase();
      const dir: Direction | null =
        raw.includes("up") ? "up" :
        raw.includes("down") ? "down" :
        raw.includes("left") ? "left" :
        raw.includes("right") ? "right" : null;

      setAiStatus(dir ? `AI chose: ${dir}` : "AI confused — random move");

      const chosenDir: Direction = dir ?? (["up","down","left","right"] as Direction[])[Math.floor(Math.random() * 4)];
      const { board: next, score: gained, moved } = applyMove(boardRef.current, chosenDir);

      if (moved) {
        const withTile = addRandomTile(next);
        const newScore = scoreRef.current + gained;
        setBoard(withTile);
        setScore(newScore);
        setBest((b) => Math.max(b, newScore));
        if (withTile.some((r) => r.includes(2048))) { setWon(true); aiLoopRef.current = false; }
        else if (!hasValidMoves(withTile)) { setGameOver(true); aiLoopRef.current = false; }
      }
    } catch {
      setAiStatus("AI unavailable");
    } finally {
      setThinking(false);
    }

    if (aiLoopRef.current) setTimeout(runAITurn, 600);
  }, []);

  const startAI = () => {
    setMode("ai");
    aiLoopRef.current = true;
    setTimeout(runAITurn, 300);
  };

  const stopAI = () => {
    aiLoopRef.current = false;
    setMode("human");
    setAiStatus("");
  };

  // Mobile swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || mode !== "human") return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const dir: Direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down" : "up");
    const { board: next, score: gained, moved } = applyMove(board, dir);
    if (!moved) return;
    const withTile = addRandomTile(next);
    const newScore = score + gained;
    setBoard(withTile);
    setScore(newScore);
    setBest((b) => Math.max(b, newScore));
    if (withTile.some((r) => r.includes(2048))) setWon(true);
    if (!hasValidMoves(withTile)) setGameOver(true);
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 select-none"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      <h2 className="font-orbitron text-3xl font-black mb-1" style={{ color: "#facc15" }}>2048</h2>
      <p className="text-sm mb-4" style={{ color: "#00f5ff88" }}>
        {mode === "ai" ? "Watch AI play · Arrow keys to take over" : "Arrow keys or swipe · or watch AI play"}
      </p>

      {/* Score bar */}
      <div className="flex gap-4 mb-4">
        {[["SCORE", score], ["BEST", best]].map(([label, val]) => (
          <div key={label as string} className="flex flex-col items-center px-4 py-2 rounded-lg"
            style={{ background: "#1e1b4b", border: "1px solid #312e8166", minWidth: 80 }}>
            <span className="text-xs font-orbitron" style={{ color: "#6366f1" }}>{label}</span>
            <span className="font-black text-lg" style={{ color: "#e0e0ff" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* AI status */}
      {mode === "ai" && (
        thinking ? <ThinkingOrbs label="AI calculating" /> :
          <p className="text-sm mb-2" style={{ color: "#00f5ff88" }}>{aiStatus}</p>
      )}

      {/* Win/Lose overlay text */}
      {won && <p className="text-2xl font-black mb-2" style={{ color: "#22c55e" }}>You reached 2048! 🎉</p>}
      {gameOver && !won && <p className="text-2xl font-black mb-2" style={{ color: "#ef4444" }}>Game Over</p>}

      {/* Board */}
      {!started ? (
        <div className="flex flex-col items-center gap-4 mt-8">
          <p style={{ color: "#a5b4fc" }}>Choose your mode:</p>
          <div className="flex gap-4">
            <button onClick={() => { startGame(); setMode("human"); }}
              className="px-6 py-3 rounded-lg font-orbitron font-bold text-sm"
              style={{ background: "#1e1b4b", border: "1px solid #6366f1", color: "#a5b4fc" }}>
              ⬅️ Play Yourself
            </button>
            <button onClick={() => { startGame(); setTimeout(startAI, 100); }}
              className="px-6 py-3 rounded-lg font-orbitron font-bold text-sm"
              style={{ background: "#1e1b4b", border: "1px solid #facc15", color: "#facc15" }}>
              🤖 Watch AI Play
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl mb-4"
            style={{ background: "#1e1b4b", border: "2px solid #312e8166" }}>
            {board.map((row, r) => (
              <div key={r} className="flex gap-2 mb-2">
                {row.map((val, c) => {
                  const { bg, color, glow } = tileStyle(val);
                  return (
                    <div key={c}
                      className="w-16 h-16 flex items-center justify-center rounded-lg font-black text-lg transition-all duration-100"
                      style={{
                        background: bg,
                        color,
                        boxShadow: glow ? `0 0 12px ${glow}` : "none",
                        fontSize: val >= 1024 ? 14 : val >= 128 ? 18 : 22,
                      }}>
                      {val !== 0 ? val : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="px-6 py-2 rounded-lg font-orbitron font-bold text-sm"
              style={{ background: "#1e1b4b22", border: "1px solid #facc1566", color: "#facc15" }}>
              NEW GAME
            </button>
            {mode === "human" && !gameOver && (
              <button onClick={startAI}
                className="px-6 py-2 rounded-lg font-orbitron font-bold text-sm"
                style={{ background: "#1e1b4b22", border: "1px solid #6366f166", color: "#a5b4fc" }}>
                🤖 AI TAKE OVER
              </button>
            )}
            {mode === "ai" && (
              <button onClick={stopAI}
                className="px-6 py-2 rounded-lg font-orbitron font-bold text-sm"
                style={{ background: "#1e1b4b22", border: "1px solid #ef444466", color: "#f87171" }}>
                ✋ STOP AI
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-4 text-xs" style={{ color: "#ffffff22" }}>Use arrow keys · swipe on mobile</p>
    </div>
  );
}
