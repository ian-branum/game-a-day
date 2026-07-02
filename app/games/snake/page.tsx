"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const GRID = 20;
const CELL = 24;
const INITIAL_SPEED = 150;

type Dir = { x: number; y: number };
type Point = { x: number; y: number };

const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Dir>(RIGHT);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const reset = () => {
    const s = [{ x: 10, y: 10 }];
    setSnake(s);
    setFood(randomFood(s));
    setDir(RIGHT);
    dirRef.current = RIGHT;
    setDead(false);
    setScore(0);
    setRunning(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d !== DOWN) setDir(UP);
      if (e.key === "ArrowDown" && d !== UP) setDir(DOWN);
      if (e.key === "ArrowLeft" && d !== RIGHT) setDir(LEFT);
      if (e.key === "ArrowRight" && d !== LEFT) setDir(RIGHT);
      if (e.key === " " && !running && !dead) reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, dead]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || prev.some((s) => s.x === head.x && s.y === head.y)) {
          setRunning(false);
          setDead(true);
          return prev;
        }
        const ate = head.x === food.x && head.y === food.y;
        const newSnake = ate ? [head, ...prev] : [head, ...prev.slice(0, -1)];
        if (ate) {
          setFood(randomFood(newSnake));
          setScore((s) => s + 10);
        }
        return newSnake;
      });
    }, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [running, food]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8">
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Snake 🐍</h1>
        <Link href="/games" className="text-sm text-gray-400 hover:text-white transition">← All Games</Link>
      </div>

      <div className="flex gap-8 mb-4 text-lg">
        <span>Score: <span className="font-bold text-green-400">{score}</span></span>
      </div>

      <div
        className="relative border-2 border-gray-700 bg-gray-900"
        style={{ width: GRID * CELL, height: GRID * CELL }}
      >
        {/* Food */}
        <div
          className="absolute bg-red-500 rounded-full"
          style={{ width: CELL - 2, height: CELL - 2, left: food.x * CELL + 1, top: food.y * CELL + 1 }}
        />
        {/* Snake */}
        {snake.map((s, i) => (
          <div
            key={i}
            className={`absolute rounded-sm ${i === 0 ? "bg-green-400" : "bg-green-600"}`}
            style={{ width: CELL - 2, height: CELL - 2, left: s.x * CELL + 1, top: s.y * CELL + 1 }}
          />
        ))}
        {/* Overlay */}
        {(!running) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            {dead ? (
              <>
                <p className="text-2xl font-bold mb-2">Game Over 💀</p>
                <p className="text-gray-300 mb-4">Score: {score}</p>
              </>
            ) : (
              <p className="text-xl font-bold mb-4">Snake 🐍</p>
            )}
            <button onClick={reset} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition">
              {dead ? "Play Again" : "Start Game"}
            </button>
            <p className="text-xs text-gray-500 mt-3">Arrow keys to move</p>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        <div />
        <button onClick={() => dir !== DOWN && setDir(UP)} className="p-3 bg-gray-800 rounded-lg text-xl hover:bg-gray-700">↑</button>
        <div />
        <button onClick={() => dir !== RIGHT && setDir(LEFT)} className="p-3 bg-gray-800 rounded-lg text-xl hover:bg-gray-700">←</button>
        <button onClick={() => dir !== UP && setDir(DOWN)} className="p-3 bg-gray-800 rounded-lg text-xl hover:bg-gray-700">↓</button>
        <button onClick={() => dir !== LEFT && setDir(RIGHT)} className="p-3 bg-gray-800 rounded-lg text-xl hover:bg-gray-700">→</button>
      </div>

      <p className="text-xs text-gray-600 mt-8">Added 2026-06-29</p>
    </main>
  );
}
