"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

function checkWinner(board: Board): Cell | "draw" | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
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
    setStatusMsg("AI is thinking...");

    const prompt = `You are playing Tic-Tac-Toe as O. The board is a 9-element array (index 0-8, left-to-right, top-to-bottom). Current board: ${JSON.stringify(currentBoard)}. null = empty, "X" = human, "O" = you. Reply with ONLY the index number (0-8) of your chosen move. Pick the best move.`;

    try {
      const res = await fetch("/api/game-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-game-ai-secret": process.env.NEXT_PUBLIC_GAME_AI_SECRET || "",
        },
        body: JSON.stringify({ prompt, game: "tictactoe" }),
      });

      const data = await res.json();
      const match = data.response?.match(/\b([0-8])\b/);
      if (match) {
        const idx = parseInt(match[1]);
        if (currentBoard[idx] === null) {
          const newBoard = [...currentBoard];
          newBoard[idx] = "O";
          setBoard(newBoard);
          const result = checkWinner(newBoard);
          if (result === "O") setStatusMsg("AI wins! 🤖");
          else if (result === "draw") setStatusMsg("It's a draw!");
          else setStatusMsg("Your turn — you're X");
        } else {
          // fallback: pick first empty
          const fallback = currentBoard.findIndex((c) => c === null);
          if (fallback !== -1) {
            const newBoard = [...currentBoard];
            newBoard[fallback] = "O";
            setBoard(newBoard);
            const result = checkWinner(newBoard);
            if (result === "O") setStatusMsg("AI wins! 🤖");
            else if (result === "draw") setStatusMsg("It's a draw!");
            else setStatusMsg("Your turn — you're X");
          }
        }
      }
    } catch {
      setStatusMsg("AI unavailable — your turn again");
    } finally {
      setIsThinking(false);
    }
  }, []);

  const handleClick = (idx: number) => {
    if (board[idx] || winner || isThinking) return;
    const newBoard = [...board];
    newBoard[idx] = "X";
    setBoard(newBoard);
    const result = checkWinner(newBoard);
    if (result === "X") { setStatusMsg("You win! 🎉"); return; }
    if (result === "draw") { setStatusMsg("It's a draw!"); return; }
    setStatusMsg("AI is thinking...");
    askAI(newBoard);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setStatusMsg("Your turn — you're X");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8">
      {/* Nav */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Tic-Tac-Toe</h1>
        <Link href="/games" className="text-sm text-gray-400 hover:text-white transition">
          ← All Games
        </Link>
      </div>

      {/* Status */}
      <p className="text-lg text-gray-300 mb-6">{statusMsg}</p>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            disabled={!!cell || !!winner || isThinking}
            className={`w-24 h-24 text-4xl font-bold rounded-xl border-2 transition
              ${cell === "X" ? "text-blue-400 border-blue-500 bg-blue-950" : ""}
              ${cell === "O" ? "text-red-400 border-red-500 bg-red-950" : ""}
              ${!cell ? "border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-500" : ""}
              ${!!winner || isThinking ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={reset}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition"
      >
        New Game
      </button>

      {/* Added date */}
      <p className="text-xs text-gray-600 mt-8">Added 2026-07-02</p>
    </main>
  );
}
