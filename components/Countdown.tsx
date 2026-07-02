"use client";

import { useEffect, useState } from "react";

function getSecondsUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Countdown() {
  const [secs, setSecs] = useState(getSecondsUntilMidnightUTC());

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsUntilMidnightUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-2 my-1 rounded-lg p-3 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d0d2b, #1a0533)", border: "1px solid #ff2d8b33" }}>
      {/* Glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #ff2d8b66, transparent)" }} />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-orbitron tracking-widest uppercase" style={{ color: "#ff2d8b" }}>
          ◆ Next Game
        </span>
        <span className="animate-pulse text-xs" style={{ color: "#ff2d8b" }}>●</span>
      </div>

      {/* Mystery game slot */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
          style={{ background: "#1a1a3a", border: "1px dashed #b44fff55" }}>
          <span className="text-2xl" style={{ filter: "blur(3px)", userSelect: "none" }}>🎮</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-orbitron font-black text-lg" style={{ color: "#b44fff", textShadow: "0 0 10px #b44fff" }}>?</span>
          </div>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-400">Coming tomorrow...</p>
          <p className="text-xs mt-0.5" style={{ color: "#b44fff88" }}>A new challenger approaches</p>
        </div>
      </div>

      {/* Countdown */}
      <div className="text-center">
        <p className="font-orbitron text-xl font-black tracking-widest"
          style={{ color: "#00f5ff", textShadow: "0 0 10px #00f5ff88" }}>
          {fmt(secs)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#ffffff33" }}>until unlock (UTC)</p>
      </div>
    </div>
  );
}
