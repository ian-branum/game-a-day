"use client";

import { useState, useCallback } from "react";
import ThinkingOrbs from "@/components/ThinkingOrbs";

type Player = 1 | 2; // 1 = Black (human), 2 = White (AI)
type Cell = 0 | Player;
type Board = Cell[][];

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

// ─── Othello logic ─────────────────────────────────────────────────────────────

function emptyBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(0));
  b[3][3] = 2; b[3][4] = 1;
  b[4][3] = 1; b[4][4] = 2;
  return b;
}

function getFlips(board: Board, r: number, c: number, player: Player): [number, number][] {
  if (board[r][c] !== 0) return [];
  const opp: Player = player === 1 ? 2 : 1;
  const flips: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

function getLegalMoves(board: Board, player: Player): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (getFlips(board, r, c, player).length > 0)
        moves.push([r, c]);
  return moves;
}

function applyMove(board: Board, r: number, c: number, player: Player): Board {
  const flips = getFlips(board, r, c, player);
  const next = board.map((row) => [...row]) as Board;
  next[r][c] = player;
  for (const [fr, fc] of flips) next[fr][fc] = player;
  return next;
}

function countDiscs(board: Board): { black: number; white: number } {
  let black = 0, white = 0;
  for (const row of board) for (const cell of row) {
    if (cell === 1) black++;
    else if (cell === 2) white++;
  }
  return { black, white };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Othello() {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState("Your turn — you are ⚫");
  const [gameOver, setGameOver] = useState(false);
  const [hover, setHover] = useState<[number, number] | null>(null);

  const legalMoves = getLegalMoves(board, 1);
  const legalSet = new Set(legalMoves.map(([r, c]) => `${r},${c}`));

  const endGame = useCallback((b: Board) => {
    const { black, white } = countDiscs(b);
    if (black > white) setStatus(`You win! ⚫ ${black} – ⬜ ${white} 🎉`);
    else if (white > black) setStatus(`AI wins! ⚫ ${black} – ⬜ ${white} 🤖`);
    else setStatus(`Draw! ⚫ ${black} – ⬜ ${white}`);
    setGameOver(true);
  }, []);

  const askAI = useCallback(async (b: Board) => {
    const aiMoves = getLegalMoves(b, 2);
    if (aiMoves.length === 0) {
      // AI passes — check if human can move
      const humanMoves = getLegalMoves(b, 1);
      if (humanMoves.length === 0) { endGame(b); return; }
      setStatus("AI passes — your turn ⚫");
      return;
    }

    setThinking(true);
    const moveList = aiMoves.map(([r, c]) => `${r},${c}`).join(", ");
    const prompt = `Board state (8x8 array, 0=empty,1=Black/you,2=White/opponent): ${JSON.stringify(b)}. Legal moves available to you (White): [${moveList}]. Choose the best move.`;

    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "",
        },
        body: JSON.stringify({ prompt, game: "othello" }),
      });
      const data = await res.json();
      const raw = data.response || "";
      const match = raw.match(/\b([0-7])\s*,\s*([0-7])\b/);
      let chosen: [number, number] | null = null;
      if (match) {
        const r = parseInt(match[1]), c = parseInt(match[2]);
        if (aiMoves.some(([mr, mc]) => mr === r && mc === c)) chosen = [r, c];
      }
      if (!chosen) chosen = aiMoves[Math.floor(Math.random() * aiMoves.length)];

      const next = applyMove(b, chosen[0], chosen[1], 2);
      setBoard(next);

      const humanMoves = getLegalMoves(next, 1);
      if (humanMoves.length === 0 && getLegalMoves(next, 2).length === 0) {
        endGame(next); return;
      }
      if (humanMoves.length === 0) {
        setStatus("No moves — AI plays again…");
        setThinking(false);
        askAI(next);
        return;
      }
      setStatus("Your turn — you are ⚫");
    } catch {
      setStatus("AI unavailable — your turn");
    } finally {
      setThinking(false);
    }
  }, [endGame]);

  const handleClick = (r: number, c: number) => {
    if (gameOver || thinking || !legalSet.has(`${r},${c}`)) return;
    const next = applyMove(board, r, c, 1);
    setBoard(next);
    setStatus("");
    askAI(next);
  };

  const reset = () => {
    setBoard(emptyBoard());
    setGameOver(false);
    setThinking(false);
    setStatus("Your turn — you are ⚫");
  };

  const { black, white } = countDiscs(board);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <h2 className="font-orbitron text-3xl font-black mb-1" style={{ color: "#4ade80" }}>OTHELLO</h2>
      <p className="text-sm mb-3" style={{ color: "#00f5ff88" }}>You vs. AI · You are ⚫ Black</p>

      {/* Score */}
      <div className="flex gap-6 mb-3">
        <div className="flex flex-col items-center px-4 py-1 rounded-lg"
          style={{ background: "#0f172a", border: "1px solid #4ade8044" }}>
          <span className="text-xs font-orbitron" style={{ color: "#4ade80" }}>⚫ YOU</span>
          <span className="font-black text-xl" style={{ color: "#e0e0ff" }}>{black}</span>
        </div>
        <div className="flex flex-col items-center px-4 py-1 rounded-lg"
          style={{ background: "#0f172a", border: "1px solid #94a3b844" }}>
          <span className="text-xs font-orbitron" style={{ color: "#94a3b8" }}>⬜ AI</span>
          <span className="font-black text-xl" style={{ color: "#e0e0ff" }}>{white}</span>
        </div>
      </div>

      {thinking ? (
        <ThinkingOrbs label="AI thinking" />
      ) : (
        <p className="text-sm font-semibold mb-3" style={{ color: "#e0e0ff" }}>{status}</p>
      )}

      {/* Board */}
      <div className="p-2 rounded-xl"
        style={{ background: "#14532d", border: "2px solid #166534" }}>
        {board.map((row, r) => (
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell, c) => {
              const isLegal = legalSet.has(`${r},${c}`) && !gameOver && !thinking;
              const isHover = hover?.[0] === r && hover?.[1] === c;
              return (
                <div key={c}
                  onClick={() => handleClick(r, c)}
                  onMouseEnter={() => setHover([r, c])}
                  onMouseLeave={() => setHover(null)}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-100"
                  style={{
                    background: isLegal && isHover ? "#166534" : "#166534",
                    cursor: isLegal ? "pointer" : "default",
                    border: isLegal ? "2px solid #4ade8077" : "2px solid transparent",
                    boxSizing: "border-box",
                  }}>
                  {cell === 1 && (
                    <div className="w-9 h-9 rounded-full"
                      style={{ background: "#111827", boxShadow: "0 2px 6px #00000088, inset 0 1px 2px #ffffff22" }} />
                  )}
                  {cell === 2 && (
                    <div className="w-9 h-9 rounded-full"
                      style={{ background: "#f8fafc", boxShadow: "0 2px 6px #00000066, inset 0 1px 2px #ffffffcc" }} />
                  )}
                  {cell === 0 && isLegal && (
                    <div className="w-3 h-3 rounded-full opacity-50"
                      style={{ background: "#4ade80" }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button onClick={reset} className="mt-5 px-8 py-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
        style={{ background: "linear-gradient(135deg, #16653422, #4ade8022)", border: "1px solid #4ade8066", color: "#4ade80" }}>
        NEW GAME
      </button>
    </div>
  );
}
