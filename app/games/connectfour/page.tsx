"use client";

import { useState, useCallback } from "react";
import ThinkingOrbs from "@/components/ThinkingOrbs";

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
  return null;
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
  const [status, setStatus] = useState<string>("Your turn — drop 🔴");
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const askAI = useCallback(async (b: Board) => {
    setThinking(true);
    const prompt = `You are playing Connect Four as player 2. Board is ${ROWS}x${COLS} (rows 0-5, cols 0-6). State: ${JSON.stringify(b)} (null=empty,1=opponent,2=you). Reply with ONLY a digit 0-6 for your column. Best move.`;
    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "" },
        body: JSON.stringify({ prompt, game: "connectfour" }),
      });
      const data = await res.json();
      const match = data.response?.match(/\b([0-6])\b/);
      let col = match ? parseInt(match[1]) : -1;
      if (col === -1 || b[0][col] !== null) col = [0,1,2,3,4,5,6].find((c) => b[0][c] === null) ?? -1;
      if (col !== -1) {
        const next = dropPiece(b, col, 2);
        if (next) {
          setBoard(next);
          const w = checkWinner(next);
          if (w === 2) { setStatus("AI wins! 🤖"); setGameOver(true); }
          else if (next[0].every((c) => c !== null)) { setStatus("Draw!"); setGameOver(true); }
          else setStatus("Your turn — drop 🔴");
        }
      }
    } catch { setStatus("AI unavailable — your turn"); }
    finally { setThinking(false); }
  }, []);

  const handleClick = (col: number) => {
    if (gameOver || thinking) return;
    const next = dropPiece(board, col, 1);
    if (!next) return;
    setBoard(next);
    const w = checkWinner(next);
    if (w === 1) { setStatus("You win! 🎉"); setGameOver(true); return; }
    if (next[0].every((c) => c !== null)) { setStatus("Draw!"); setGameOver(true); return; }
    askAI(next);
  };

  const reset = () => { setBoard(emptyBoard()); setGameOver(false); setThinking(false); setStatus("Your turn — drop 🔴"); };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <h2 className="font-orbitron text-3xl font-black mb-1"><span style={{ color: "#60a5fa" }}>CONNECT FOUR</span></h2>
      <p className="text-sm mb-4" style={{ color: "#00f5ff88" }}>You vs. AI · You are 🔴</p>

      {thinking ? (
        <ThinkingOrbs label="AI plotting" />
      ) : (
        <p className="text-lg font-semibold mb-4">{status}</p>
      )}

      <div className="flex gap-1 mb-1">
        {Array.from({ length: COLS }, (_, c) => (
          <button key={c} onClick={() => handleClick(c)}
            onMouseEnter={() => setHoverCol(c)} onMouseLeave={() => setHoverCol(null)}
            disabled={gameOver || thinking}
            className="w-12 h-7 rounded transition-all text-sm disabled:opacity-30"
            style={{ color: hoverCol === c ? "#ff2d8b" : "#ffffff44" }}>▼</button>
        ))}
      </div>

      <div className="p-2 rounded-xl" style={{ background: "#1e3a8a", border: "2px solid #3b82f666" }}>
        {board.map((row, r) => (
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell, c) => (
              <div key={c} onClick={() => handleClick(c)}
                className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "#0f172a" }}>
                {cell === 1 && <div className="w-10 h-10 rounded-full" style={{ background: "#ef4444", boxShadow: "0 0 8px #ef444466" }} />}
                {cell === 2 && <div className="w-10 h-10 rounded-full" style={{ background: "#facc15", boxShadow: "0 0 8px #facc1566" }} />}
                {!cell && hoverCol === c && !gameOver && !thinking && (
                  <div className="w-10 h-10 rounded-full opacity-20" style={{ background: "#ef4444" }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={reset} className="mt-6 px-8 py-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
        style={{ background: "linear-gradient(135deg, #1d4ed822, #3b82f622)", border: "1px solid #3b82f666", color: "#60a5fa" }}>
        NEW GAME
      </button>
    </div>
  );
}
