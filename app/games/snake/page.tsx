"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID = 20;
const CELL = 22;

type Dir = { x: number; y: number };
type Point = { x: number; y: number };

const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

function randomFood(snake: Point[]): Point {
  let p: Point;
  do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
  while (snake.some((s) => s.x === p.x && s.y === p.y));
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
  const foodRef = useRef(food);
  foodRef.current = food;

  const reset = () => {
    const s = [{ x: 10, y: 10 }];
    setSnake(s); setFood(randomFood(s)); setDir(RIGHT);
    dirRef.current = RIGHT; setDead(false); setScore(0); setRunning(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d !== DOWN) { e.preventDefault(); setDir(UP); }
      if (e.key === "ArrowDown" && d !== UP) { e.preventDefault(); setDir(DOWN); }
      if (e.key === "ArrowLeft" && d !== RIGHT) { e.preventDefault(); setDir(LEFT); }
      if (e.key === "ArrowRight" && d !== LEFT) { e.preventDefault(); setDir(RIGHT); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || prev.some((s) => s.x === head.x && s.y === head.y)) {
          setRunning(false); setDead(true); return prev;
        }
        const f = foodRef.current;
        const ate = head.x === f.x && head.y === f.y;
        const newSnake = ate ? [head, ...prev] : [head, ...prev.slice(0, -1)];
        if (ate) { const nf = randomFood(newSnake); setFood(nf); foodRef.current = nf; setScore((s) => s + 10); }
        return newSnake;
      });
    }, 140);
    return () => clearInterval(interval);
  }, [running]);

  const btnDir = (d: Dir, opp: Dir) => () => { if (dirRef.current !== opp) setDir(d); };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <h2 className="font-orbitron text-3xl font-black mb-1" style={{ color: "#16a34a" }}>
        <span style={{ color: "#4ade80" }}>SNAKE</span>
      </h2>
      <p className="text-sm mb-2" style={{ color: "#00f5ff88" }}>Don't crash. Eat the red dot.</p>
      <p className="text-lg font-bold mb-3" style={{ color: "#4ade80" }}>Score: {score}</p>

      <div className="relative border-2 rounded-lg overflow-hidden"
        style={{ width: GRID * CELL, height: GRID * CELL, borderColor: "#16a34a55", background: "#0a1a0a" }}>
        {/* Grid lines (subtle) */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(#16a34a11 1px, transparent 1px), linear-gradient(90deg, #16a34a11 1px, transparent 1px)`, backgroundSize: `${CELL}px ${CELL}px` }} />
        {/* Food */}
        <div className="absolute rounded-full" style={{ width: CELL - 4, height: CELL - 4, left: food.x * CELL + 2, top: food.y * CELL + 2, background: "#ef4444", boxShadow: "0 0 8px #ef4444aa" }} />
        {/* Snake */}
        {snake.map((s, i) => (
          <div key={i} className="absolute rounded-sm" style={{
            width: CELL - 2, height: CELL - 2, left: s.x * CELL + 1, top: s.y * CELL + 1,
            background: i === 0 ? "#4ade80" : "#16a34a",
            boxShadow: i === 0 ? "0 0 6px #4ade80aa" : "none",
          }} />
        ))}
        {/* Overlay */}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
            {dead && <><p className="font-orbitron text-xl font-bold mb-1" style={{ color: "#ef4444" }}>GAME OVER</p><p className="text-gray-400 mb-4">Score: {score}</p></>}
            <button onClick={reset} className="px-6 py-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
              style={{ background: "#16a34a33", border: "1px solid #4ade8066", color: "#4ade80" }}>
              {dead ? "PLAY AGAIN" : "START"}
            </button>
            {!dead && <p className="text-xs mt-3" style={{ color: "#ffffff44" }}>Arrow keys or buttons below</p>}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div />
        <button onClick={btnDir(UP, DOWN)} className="p-3 rounded-lg text-lg transition" style={{ background: "#16a34a22", border: "1px solid #16a34a44", color: "#4ade80" }}>↑</button>
        <div />
        <button onClick={btnDir(LEFT, RIGHT)} className="p-3 rounded-lg text-lg transition" style={{ background: "#16a34a22", border: "1px solid #16a34a44", color: "#4ade80" }}>←</button>
        <button onClick={btnDir(DOWN, UP)} className="p-3 rounded-lg text-lg transition" style={{ background: "#16a34a22", border: "1px solid #16a34a44", color: "#4ade80" }}>↓</button>
        <button onClick={btnDir(RIGHT, LEFT)} className="p-3 rounded-lg text-lg transition" style={{ background: "#16a34a22", border: "1px solid #16a34a44", color: "#4ade80" }}>→</button>
      </div>
    </div>
  );
}
