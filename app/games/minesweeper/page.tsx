"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adj: number;
};

function buildBoard(firstClick: number): Cell[][] {
  const total = ROWS * COLS;
  const mineSet = new Set<number>();
  // avoid first click and its neighbors
  const avoid = new Set<number>();
  const fr = Math.floor(firstClick / COLS);
  const fc = firstClick % COLS;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r2 = fr + dr, c2 = fc + dc;
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) avoid.add(r2 * COLS + c2);
    }
  while (mineSet.size < MINES) {
    const n = Math.floor(Math.random() * total);
    if (!avoid.has(n)) mineSet.add(n);
  }
  const board: Cell[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      mine: mineSet.has(r * COLS + c),
      revealed: false,
      flagged: false,
      adj: 0,
    }))
  );
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS && board[r2][c2].mine) count++;
        }
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
    if (cell.adj === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) stack.push([cr + dr, cc + dc]);
    }
  }
  return next;
}

const ADJ_COLORS = ["", "text-blue-400", "text-green-400", "text-red-400", "text-purple-400", "text-yellow-400", "text-cyan-400", "text-pink-400", "text-gray-400"];

export default function Minesweeper() {
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [flags, setFlags] = useState(0);

  const start = () => { setBoard(null); setStatus("playing"); setFlags(0); };

  const handleClick = (r: number, c: number) => {
    if (status !== "playing") return;
    let b = board;
    if (!b) {
      b = buildBoard(r * COLS + c);
      setBoard(b);
    }
    const cell = b[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      // reveal all mines
      const next = b.map((row) => row.map((cl) => cl.mine ? { ...cl, revealed: true } : { ...cl }));
      setBoard(next);
      setStatus("lost");
      return;
    }
    const next = revealFlood(b, r, c);
    setBoard(next);
    // check win
    const won = next.every((row) => row.every((cl) => cl.mine || cl.revealed));
    if (won) setStatus("won");
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

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8">
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Minesweeper 💣</h1>
        <Link href="/games" className="text-sm text-gray-400 hover:text-white transition">← All Games</Link>
      </div>

      <div className="flex gap-6 mb-4 text-sm text-gray-400">
        <span>💣 {MINES - flags} remaining</span>
        {status === "won" && <span className="text-green-400 font-bold">You win! 🎉</span>}
        {status === "lost" && <span className="text-red-400 font-bold">Boom! 💥</span>}
      </div>

      {status === "idle" ? (
        <div className="flex flex-col items-center gap-4 mt-12">
          <p className="text-gray-400">9×9 grid, 10 mines</p>
          <button onClick={start} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-semibold transition">Start Game</button>
          <p className="text-xs text-gray-500">Left click to reveal · Right click to flag</p>
        </div>
      ) : (
        <>
          <div className="border-2 border-gray-700 bg-gray-900 inline-block">
            {(board || Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })))).map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <button
                    key={c}
                    onClick={() => handleClick(r, c)}
                    onContextMenu={(e) => handleFlag(e, r, c)}
                    className={`w-9 h-9 text-sm font-bold border border-gray-800 flex items-center justify-center transition
                      ${cell.revealed
                        ? cell.mine ? "bg-red-900 text-white" : "bg-gray-800"
                        : cell.flagged ? "bg-gray-700 text-yellow-400" : "bg-gray-700 hover:bg-gray-600 cursor-pointer"}
                    `}
                  >
                    {cell.revealed && !cell.mine && cell.adj > 0 && <span className={ADJ_COLORS[cell.adj]}>{cell.adj}</span>}
                    {cell.revealed && cell.mine && "💣"}
                    {!cell.revealed && cell.flagged && "🚩"}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <button onClick={start} className="mt-6 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-semibold transition">
            New Game
          </button>
        </>
      )}

      <p className="text-xs text-gray-600 mt-8">Added 2026-06-30</p>
    </main>
  );
}
