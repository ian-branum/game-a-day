"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CONTAINER_WIDTH = 360;
const CONTAINER_HEIGHT = 480;
const BUCKET_WIDTH = 0.15; // normalized
const BUCKET_SPEED = 0.012; // normalized per frame
const FIREWORK_RADIUS = 14;
const COLORS = ["#ff4444", "#4488ff", "#ffffff", "#ffd700", "#ff69b4"];
const INITIAL_LIVES = 3;

type Firework = {
  id: number;
  x: number;
  y: number;
  speed: number;
  color: string;
};

type Sparkle = {
  id: number;
  x: number; // px from container left
  y: number; // px from container top
  dx: number;
  dy: number;
  color: string;
  born: number;
};

type GameStatus = "idle" | "playing" | "gameover";

let fireworkIdCounter = 0;
let sparkleIdCounter = 0;

export default function FireworksCatch() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [flash, setFlash] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  // Refs for hot-path game state
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const statusRef = useRef<GameStatus>("idle");
  const fireworksRef = useRef<Firework[]>([]);
  const bucketXRef = useRef(0.5); // normalized center
  const keysRef = useRef({ left: false, right: false });
  const rafRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);

  const getSpawnInterval = useCallback((sc: number) => {
    const tier = Math.floor(sc / 50);
    return Math.max(600, 1800 - tier * 150);
  }, []);

  const getBaseSpeed = useCallback((sc: number) => {
    const tier = Math.floor(sc / 50);
    return 0.0012 + tier * 0.0002;
  }, []);

  const triggerSparkles = useCallback((px: number, py: number, color: string) => {
    const count = 6 + Math.floor(Math.random() * 3);
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2;
      newSparkles.push({
        id: sparkleIdCounter++,
        x: px,
        y: py,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color,
        born: performance.now(),
      });
    }
    setSparkles((prev) => [...prev, ...newSparkles]);
    setTimeout(() => {
      const ids = new Set(newSparkles.map((s) => s.id));
      setSparkles((prev) => prev.filter((s) => !ids.has(s.id)));
    }, 450);
  }, []);

  const endGame = useCallback(() => {
    statusRef.current = "gameover";
    setStatus("gameover");
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    if (livesRef.current <= 0) {
      endGame();
    }
  }, [endGame]);

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (statusRef.current !== "playing") return;

      const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : 16;
      lastFrameRef.current = timestamp;
      const dt = Math.min(delta, 50); // cap to avoid big jumps

      // Move bucket
      if (keysRef.current.left) {
        bucketXRef.current = Math.max(BUCKET_WIDTH / 2, bucketXRef.current - BUCKET_SPEED * (dt / 16));
      }
      if (keysRef.current.right) {
        bucketXRef.current = Math.min(1 - BUCKET_WIDTH / 2, bucketXRef.current + BUCKET_SPEED * (dt / 16));
      }

      // Spawn fireworks
      const spawnInterval = getSpawnInterval(scoreRef.current);
      if (timestamp - lastSpawnRef.current > spawnInterval) {
        lastSpawnRef.current = timestamp;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        fireworksRef.current.push({
          id: fireworkIdCounter++,
          x: 0.05 + Math.random() * 0.9,
          y: 0,
          speed: getBaseSpeed(scoreRef.current) * (0.8 + Math.random() * 0.4),
          color,
        });
      }

      // Move fireworks
      const bucketTop = 0.88; // normalized y where bucket top is
      const bucketLeft = bucketXRef.current - BUCKET_WIDTH / 2;
      const bucketRight = bucketXRef.current + BUCKET_WIDTH / 2;
      const survived: Firework[] = [];
      const caught: { fw: Firework }[] = [];
      const missed: Firework[] = [];

      for (const fw of fireworksRef.current) {
        fw.y += fw.speed * (dt / 16);

        const fwBottom = fw.y + FIREWORK_RADIUS / CONTAINER_HEIGHT;

        if (fwBottom >= bucketTop && fw.y < 1) {
          // Check horizontal overlap with bucket
          const fwLeft = fw.x - FIREWORK_RADIUS / CONTAINER_WIDTH;
          const fwRight = fw.x + FIREWORK_RADIUS / CONTAINER_WIDTH;
          if (fwRight >= bucketLeft && fwLeft <= bucketRight) {
            caught.push({ fw });
            continue;
          }
        }

        if (fw.y > 1.05) {
          missed.push(fw);
          continue;
        }

        survived.push(fw);
      }

      fireworksRef.current = survived;

      // Handle caught
      if (caught.length > 0) {
        const newScore = scoreRef.current + caught.length * 10;
        scoreRef.current = newScore;
        setScore(newScore);
        for (const { fw } of caught) {
          const px = fw.x * CONTAINER_WIDTH;
          const py = bucketTop * CONTAINER_HEIGHT;
          triggerSparkles(px, py, fw.color);
        }
      }

      // Handle missed
      if (missed.length > 0) {
        for (let i = 0; i < missed.length; i++) {
          livesRef.current -= 1;
          setLives((l) => l - 1);
          setFlash(true);
          setTimeout(() => setFlash(false), 250);
          if (livesRef.current <= 0) {
            endGame();
            return;
          }
        }
      }

      // Render update trigger — we use a forceRender to keep fireworks visible
      forceRenderRef.current?.();

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [getSpawnInterval, getBaseSpeed, triggerSparkles, endGame]
  );

  // Force render mechanism for fireworks display
  const [renderTick, setRenderTick] = useState(0);
  const forceRenderRef = useRef<(() => void) | null>(null);
  forceRenderRef.current = () => setRenderTick((t) => t + 1);

  const startGame = useCallback(() => {
    fireworksRef.current = [];
    bucketXRef.current = 0.5;
    keysRef.current = { left: false, right: false };
    scoreRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    lastSpawnRef.current = 0;
    lastFrameRef.current = 0;
    fireworkIdCounter = 0;
    setScore(0);
    setLives(INITIAL_LIVES);
    setSparkles([]);
    setFlash(false);
    statusRef.current = "playing";
    setStatus("playing");

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); keysRef.current.left = true; }
      if (e.key === "ArrowRight") { e.preventDefault(); keysRef.current.right = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const bucketPxX = bucketXRef.current * CONTAINER_WIDTH;
  const bucketPxY = CONTAINER_HEIGHT * 0.88;
  const bucketPxW = BUCKET_WIDTH * CONTAINER_WIDTH;
  const bucketPxH = 22;

  const livesDisplay = Array.from({ length: INITIAL_LIVES }, (_, i) => i < lives ? "🎆" : "💨");

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      {/* Title */}
      <h2
        className="font-orbitron text-2xl font-black mb-0.5 text-center"
        style={{ color: "#ffd700", textShadow: "0 0 12px #ffd70088" }}
      >
        FIREWORKS CATCH
      </h2>
      <p className="text-sm mb-2" style={{ color: "#ffffff88" }}>
        🎆 Happy 4th of July! 🎆
      </p>

      {/* Score and lives */}
      <div className="flex items-center gap-6 mb-3">
        <span className="font-orbitron font-bold text-lg" style={{ color: "#ffd700" }}>
          {score}
        </span>
        <span className="text-xl tracking-widest">{livesDisplay.join("")}</span>
      </div>

      {/* Game container */}
      <div
        className="relative overflow-hidden rounded-xl border-2"
        style={{
          width: CONTAINER_WIDTH,
          height: CONTAINER_HEIGHT,
          background: "#05071a",
          borderColor: "#ffd70033",
          boxShadow: flash
            ? "0 0 40px #ff000088, inset 0 0 40px #ff000044"
            : "0 0 20px #ffd70022",
          transition: "box-shadow 0.1s",
        }}
      >
        {/* Stars background */}
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              left: `${(i * 73 + 11) % 100}%`,
              top: `${(i * 47 + 7) % 85}%`,
              background: "#ffffff",
              opacity: 0.3 + (i % 4) * 0.15,
            }}
          />
        ))}

        {/* Fireworks */}
        {fireworksRef.current.map((fw) => (
          <div
            key={fw.id}
            className="absolute rounded-full"
            style={{
              width: FIREWORK_RADIUS * 2,
              height: FIREWORK_RADIUS * 2,
              left: fw.x * CONTAINER_WIDTH - FIREWORK_RADIUS,
              top: fw.y * CONTAINER_HEIGHT - FIREWORK_RADIUS,
              background: fw.color,
              boxShadow: `0 0 10px ${fw.color}, 0 0 20px ${fw.color}88`,
              transition: "none",
            }}
          />
        ))}

        {/* Sparkles */}
        {sparkles.map((sp) => {
          const age = performance.now() - sp.born;
          const life = 450;
          const frac = age / life;
          const opacity = Math.max(0, 1 - frac);
          const tx = sp.dx * frac * 40;
          const ty = sp.dy * frac * 40;
          return (
            <div
              key={sp.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 6,
                height: 6,
                left: sp.x - 3 + tx,
                top: sp.y - 3 + ty,
                background: sp.color,
                opacity,
                boxShadow: `0 0 6px ${sp.color}`,
              }}
            />
          );
        })}

        {/* Bucket */}
        {status === "playing" && (
          <div
            className="absolute rounded-sm"
            style={{
              width: bucketPxW,
              height: bucketPxH,
              left: bucketPxX - bucketPxW / 2,
              top: bucketPxY,
              background: "linear-gradient(90deg, #cc2222 33%, #ffffff 33%, #ffffff 66%, #2244cc 66%)",
              boxShadow: "0 0 8px #ffffff88, 0 0 16px #4488ff44",
              borderRadius: 4,
            }}
          />
        )}

        {/* Red flash overlay */}
        {flash && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "#ff000033", zIndex: 10 }}
          />
        )}

        {/* Overlay: idle or gameover */}
        {status !== "playing" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.78)", zIndex: 20 }}
          >
            {status === "gameover" && (
              <>
                <p
                  className="font-orbitron text-2xl font-bold mb-1"
                  style={{ color: "#ff4444", textShadow: "0 0 12px #ff4444" }}
                >
                  GAME OVER
                </p>
                <p className="mb-1" style={{ color: "#ffffff88" }}>
                  Final Score
                </p>
                <p
                  className="font-orbitron text-3xl font-black mb-5"
                  style={{ color: "#ffd700" }}
                >
                  {score}
                </p>
              </>
            )}
            {status === "idle" && (
              <>
                <p
                  className="font-orbitron text-xl font-bold mb-1"
                  style={{ color: "#ffd700", textShadow: "0 0 12px #ffd700" }}
                >
                  FIREWORKS CATCH
                </p>
                <p className="text-sm mb-5 text-center px-6" style={{ color: "#ffffff66" }}>
                  Catch falling fireworks with your bucket!
                </p>
              </>
            )}
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all"
              style={{
                background: "#ffd70022",
                border: "2px solid #ffd70066",
                color: "#ffd700",
              }}
            >
              {status === "gameover" ? "PLAY AGAIN" : "START"}
            </button>
            {status === "idle" && (
              <p className="text-xs mt-4" style={{ color: "#ffffff33" }}>
                Arrow keys or buttons below
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex gap-6 mt-4">
        <button
          onPointerDown={() => { keysRef.current.left = true; }}
          onPointerUp={() => { keysRef.current.left = false; }}
          onPointerLeave={() => { keysRef.current.left = false; }}
          className="select-none rounded-xl font-bold text-2xl transition-all"
          style={{
            width: 72,
            height: 56,
            background: "#ffd70022",
            border: "2px solid #ffd70055",
            color: "#ffd700",
            touchAction: "none",
          }}
        >
          ←
        </button>
        <button
          onPointerDown={() => { keysRef.current.right = true; }}
          onPointerUp={() => { keysRef.current.right = false; }}
          onPointerLeave={() => { keysRef.current.right = false; }}
          className="select-none rounded-xl font-bold text-2xl transition-all"
          style={{
            width: 72,
            height: 56,
            background: "#ffd70022",
            border: "2px solid #ffd70055",
            color: "#ffd700",
            touchAction: "none",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
