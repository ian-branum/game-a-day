"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const ROWS = 6;
const COLS = 7;
type Player = 1 | 2;
type Board = (Player | null)[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function dropPiece(board: Board, col: number, player: Player): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      const next = board.map((row) => [...row]);
      next[r][col] = player;
      return next;
    }
  }
  return null; // column full
}

function checkWinner(board: Board): Player | null {
  const check = (r: number, c: number, dr: number, dc: number): Player | null => {
    const p = board[r][c];
    if (!p) return null;
    for (let i = 1; i < 4; i++) {
      const r2 = r + dr * i, c2 = c + dc * i;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS || board[r2][c2] !== p) return null;
    }
    return p;
  };
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        const w = check(r, c, dr, dc);
        if (w) return w;
      }
  return null;
}

export default function ConnectFour() {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState<string>("Your turn — you're 🔴");
  const [gameOver, setGameOver] = useState(false);

  const askAI = useCallback(async (b: Board) => {
    setThinking(true);
    setStatus("AI is thinking...");
    const prompt = `You are playing Connect Four as player 2 (🟡). The board is a ${ROWS}x${COLS} grid (rows 0-5 top to bottom, cols 0-6). Board state (null=empty, 1=opponent/red, 2=you/yellow): ${JSON.stringify(b)}. Reply with ONLY a single digit (0-6) for the column you want to drop your piece in. Pick the best move to win or block.`;
    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "" },
        body: JSON.stringify({ prompt, game: "connectfour" }),
      });
      const data = await res.json();
      const match = data.response?.match(/\b([0-6])\b/);
      let col = match ? parseInt(match[1]) : -1;
      // fallback: first non-full column
      if (col === -1 || b[0][col] !== null) {
        col = [0,1,2,3,4,5,6].find((c) => b[0][c] === null) ?? -1;
      }
      if (col !== -1) {
        const next = dropPiece(b, col, 2);
        if (next) {
          setBoard(next);
          const w = checkWinner(next);
          if (w === 2) { setStatus("AI wins! 🤖"); setGameOver(true); }
          else if (next[0].every((c) => c !== null)) { setStatus("It's a draw!"); setGameOver(true); }
          else setStatus("Your turn — you're 🔴");
        }
      }
    } catch {
      setStatus("AI unavailable — your turn again");
    } finally {
      setThinking(false);
    }
  }, []);

  const handleClick = (col: number) => {
    if (gameOver || thinking) return;
    const next = dropPiece(board, col, 1);
    if (!next) return;
    setBoard(next);
    const w = checkWinner(next);
    if (w === 1) { setStatus("You win! 🎉"); setGameOver(true); return; }
    if (next[0].every((c) => c !== null)) { setStatus("It's a draw!"); setGameOver(true); return; }
    askAI(next);
  };

  const reset = () => {
    setBoard(emptyBoard());
    setGameOver(false);
    setThinking(false);
    setStatus("Your turn — you're 🔴");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8">
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Connect Four</h1>
        <Link href="/games" className="text-sm text-gray-400 hover:text-white transition">← All Games</Link>
      </div>

      <p className="text-lg text-gray-300 mb-4">{status}</p>

      {/* Column buttons */}
      <div className="flex gap-1 mb-1">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            onClick={() => handleClick(c)}
            disabled={gameOver || thinking}
            className="w-12 h-8 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition disabled:opacity-30 disabled:cursor-not-allowed text-lg"
          >
            ▼
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="bg-blue-800 p-2 rounded-xl border-4 border-blue-700">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell, c) => (
              <div key={c} className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-900">
                {cell === 1 && <div className="w-10 h-10 rounded-full bg-red-500 shadow-lg" />}
                {cell === 2 && <div className="w-10 h-10 rounded-full bg-yellow-400 shadow-lg" />}
                {!cell && <div className="w-10 h-10 rounded-full bg-gray-950 opacity-80" />}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={reset} className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition">
        New Game
      </button>

      <p className="text-xs text-gray-600 mt-8">Added 2026-07-01</p>
    </main>
  );
}
