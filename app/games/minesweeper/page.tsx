"use client";

import { useState } from "react";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number; };

function buildBoard(firstClick: number): Cell[][] {
  const avoid = new Set<number>();
  const fr = Math.floor(firstClick / COLS), fc = firstClick % COLS;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r2 = fr + dr, c2 = fc + dc;
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) avoid.add(r2 * COLS + c2);
    }
  const mineSet = new Set<number>();
  while (mineSet.size < MINES) { const n = Math.floor(Math.random() * ROWS * COLS); if (!avoid.has(n)) mineSet.add(n); }
  const board: Cell[][] = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => ({ mine: mineSet.has(r * COLS + c), revealed: false, flagged: false, adj: 0 })));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r2 = r+dr, c2 = c+dc; if (r2>=0&&r2<ROWS&&c2>=0&&c2<COLS&&board[r2][c2].mine) count++; }
      board[r][c].adj = count;
    }
  return board;
}

function revealFlood(board: Cell[][], r: number, c: number): Cell[][] {
  const next = board.map((row) => row.map((cell) => ({ ...cell })));
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
    const cell = next[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) stack.push([cr+dr, cc+dc]);
  }
  return next;
}

const ADJ_COLORS = ["", "#60a5fa", "#4ade80", "#f87171", "#c084fc", "#fb923c", "#22d3ee", "#f472b6", "#94a3b8"];

export default function Minesweeper() {
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [status, setStatus] = useState<"idle"|"playing"|"won"|"lost">("idle");
  const [flags, setFlags] = useState(0);

  const start = () => { setBoard(null); setStatus("playing"); setFlags(0); };

  const handleClick = (r: number, c: number) => {
    if (status !== "playing") return;
    let b = board;
    if (!b) { b = buildBoard(r * COLS + c); setBoard(b); }
    const cell = b[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      const next = b.map((row) => row.map((cl) => cl.mine ? { ...cl, revealed: true } : { ...cl }));
      setBoard(next); setStatus("lost"); return;
    }
    const next = revealFlood(b, r, c);
    setBoard(next);
    if (next.every((row) => row.every((cl) => cl.mine || cl.revealed))) setStatus("won");
  };

  const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status !== "playing" || !board) return;
    const cell = board[r][c];
    if (cell.revealed) return;
    const next = board.map((row) => row.map((cl) => ({ ...cl })));
    next[r][c].flagged = !next[r][c].flagged;
    setFlags((f) => next[r][c].flagged ? f + 1 : f - 1);
    setBoard(next);
  };

  const emptyBoard = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })));

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <h2 className="font-orbitron text-3xl font-black mb-1"><span style={{ color: "#fbbf24" }}>MINESWEEPER</span></h2>
      <p className="text-sm mb-2" style={{ color: "#00f5ff88" }}>9×9 · 10 mines · Left click reveal · Right click flag</p>

      <div className="flex gap-6 mb-4 text-sm font-semibold">
        <span style={{ color: "#fbbf24" }}>💣 {MINES - flags} left</span>
        {status === "won" && <span style={{ color: "#4ade80" }}>You cleared it! 🎉</span>}
        {status === "lost" && <span style={{ color: "#ef4444" }}>Boom! 💥</span>}
      </div>

      {status === "idle" ? (
        <div className="flex flex-col items-center gap-4 mt-8">
          <button onClick={start} className="px-8 py-3 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
            style={{ background: "#ca8a0422", border: "1px solid #fbbf2466", color: "#fbbf24" }}>
            START GAME
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#ca8a0444" }}>
            {(board || emptyBoard).map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <button key={c} onClick={() => handleClick(r, c)} onContextMenu={(e) => handleFlag(e, r, c)}
                    className="w-9 h-9 text-xs font-bold border flex items-center justify-center transition-all select-none"
                    style={{
                      borderColor: "#2a2a6a",
                      background: cell.revealed ? (cell.mine ? "#7f1d1d" : "#0d0d2b") : cell.flagged ? "#1a1a3a" : "#12123a",
                      cursor: cell.revealed ? "default" : "pointer",
                      color: cell.adj > 0 ? ADJ_COLORS[cell.adj] : "white",
                    }}>
                    {cell.revealed && !cell.mine && cell.adj > 0 && cell.adj}
                    {cell.revealed && cell.mine && "💣"}
                    {!cell.revealed && cell.flagged && "🚩"}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button onClick={start} className="mt-6 px-8 py-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
            style={{ background: "#ca8a0422", border: "1px solid #fbbf2466", color: "#fbbf24" }}>
            NEW GAME
          </button>
        </>
      )}
    </div>
  );
}
