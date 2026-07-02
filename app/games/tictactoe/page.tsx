"use client";

import { useState, useCallback } from "react";
import ThinkingOrbs from "@/components/ThinkingOrbs";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): Cell | "draw" | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isThinking, setIsThinking] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Your turn — you're X");

  const winner = checkWinner(board);

  const askAI = useCallback(async (currentBoard: Board) => {
    setIsThinking(true);
    const prompt = `You are playing Tic-Tac-Toe as O. The board is a 9-element array (index 0-8, left-to-right, top-to-bottom). Current board: ${JSON.stringify(currentBoard)}. null = empty, "X" = human, "O" = you. Reply with ONLY the index number (0-8) of your chosen move. Pick the best move.`;
    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "" },
        body: JSON.stringify({ prompt, game: "tictactoe" }),
      });
      const data = await res.json();
      const match = data.response?.match(/\b([0-8])\b/);
      if (match) {
        const idx = parseInt(match[1]);
        const pick = currentBoard[idx] === null ? idx : currentBoard.findIndex((c) => c === null);
        if (pick !== -1) {
          const newBoard = [...currentBoard];
          newBoard[pick] = "O";
          setBoard(newBoard);
          const result = checkWinner(newBoard);
          if (result === "O") setStatusMsg("AI wins! 🤖");
          else if (result === "draw") setStatusMsg("It's a draw!");
          else setStatusMsg("Your turn — you're X");
        }
      }
    } catch { setStatusMsg("AI unavailable — your turn again"); }
    finally { setIsThinking(false); }
  }, []);

  const handleClick = (idx: number) => {
    if (board[idx] || winner || isThinking) return;
    const newBoard = [...board];
    newBoard[idx] = "X";
    setBoard(newBoard);
    const result = checkWinner(newBoard);
    if (result === "X") { setStatusMsg("You win! 🎉"); return; }
    if (result === "draw") { setStatusMsg("It's a draw!"); return; }
    setStatusMsg("");
    askAI(newBoard);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setStatusMsg("Your turn — you're X"); };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <h2 className="font-orbitron text-3xl font-black mb-1" style={{ color: "#b44fff" }}>TIC-TAC-TOE</h2>
      <p className="text-sm mb-4" style={{ color: "#00f5ff88" }}>You vs. AI · You are X</p>

      {isThinking ? (
        <ThinkingOrbs label="AI calculating" />
      ) : (
        <p className="text-lg font-semibold mb-4" style={{ color: "#e0e0ff" }}>{statusMsg}</p>
      )}

      <div className="grid grid-cols-3 gap-2 mb-6">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            disabled={!!cell || !!winner || isThinking}
            className="w-24 h-24 text-4xl font-black rounded-xl transition-all duration-150"
            style={{
              background: cell === "X" ? "#1e1b4b" : cell === "O" ? "#1a0533" : "#0d0d2b",
              border: cell === "X" ? "2px solid #818cf8" : cell === "O" ? "2px solid #b44fff" : "2px solid #2a2a6a",
              color: cell === "X" ? "#818cf8" : "#b44fff",
              boxShadow: cell ? `0 0 12px ${cell === "X" ? "#818cf844" : "#b44fff44"}` : "none",
            }}
          >
            {cell}
          </button>
        ))}
      </div>

      <button onClick={reset} className="px-8 py-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
        style={{ background: "linear-gradient(135deg, #b44fff22, #ff2d8b22)", border: "1px solid #b44fff66", color: "#b44fff" }}>
        NEW GAME
      </button>
    </div>
  );
}
