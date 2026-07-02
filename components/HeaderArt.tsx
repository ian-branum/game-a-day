"use client";

import { useEffect, useState } from "react";

// Floating sparkle that animates independently
function Sparkle({ x, y, delay, size = 6 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <g style={{ animation: `sparkle-float 3s ease-in-out ${delay}s infinite` }}>
      <polygon
        points={`${x},${y - size} ${x + size * 0.3},${y - size * 0.3} ${x + size},${y} ${x + size * 0.3},${y + size * 0.3} ${x},${y + size} ${x - size * 0.3},${y + size * 0.3} ${x - size},${y} ${x - size * 0.3},${y - size * 0.3}`}
        fill="#ffd700"
        opacity="0.8"
      />
    </g>
  );
}

export default function HeaderArt() {
  return (
    <>
      <style>{`
        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-6px) scale(1.2); opacity: 1; }
        }
        @keyframes chibi-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes katakana-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes orb-spin {
          0% { transform: rotate(0deg) translateX(10px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(10px) rotate(-360deg); }
        }
        @keyframes orb-spin2 {
          0% { transform: rotate(120deg) translateX(10px) rotate(-120deg); }
          100% { transform: rotate(480deg) translateX(10px) rotate(-480deg); }
        }
        @keyframes orb-spin3 {
          0% { transform: rotate(240deg) translateX(10px) rotate(-240deg); }
          100% { transform: rotate(600deg) translateX(10px) rotate(-600deg); }
        }
        .thinking-orb-1 { animation: orb-spin 1.2s linear infinite; }
        .thinking-orb-2 { animation: orb-spin2 1.2s linear infinite; }
        .thinking-orb-3 { animation: orb-spin3 1.2s linear infinite; }
      `}</style>

      <svg
        viewBox="0 0 320 72"
        width="320"
        height="72"
        className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2"
        style={{ opacity: 0.95 }}
        aria-hidden="true"
      >
        {/* Katakana vertical strip */}
        <g style={{ animation: "katakana-glow 2.5s ease-in-out infinite" }}>
          <text x="14" y="14" fontFamily="monospace" fontSize="9" fill="#b44fff" letterSpacing="2">ゲ</text>
          <text x="14" y="26" fontFamily="monospace" fontSize="9" fill="#b44fff" letterSpacing="2">ー</text>
          <text x="14" y="38" fontFamily="monospace" fontSize="9" fill="#ff2d8b" letterSpacing="2">ム</text>
          <text x="14" y="50" fontFamily="monospace" fontSize="9" fill="#b44fff" letterSpacing="2">毎</text>
          <text x="14" y="62" fontFamily="monospace" fontSize="9" fill="#ff2d8b" letterSpacing="2">日</text>
        </g>

        {/* Divider line */}
        <line x1="30" y1="4" x2="30" y2="68" stroke="#2a2a6a" strokeWidth="1" />

        {/* Chibi game controller character */}
        <g style={{ animation: "chibi-bob 2s ease-in-out infinite", transformOrigin: "175px 36px" }}>
          {/* Body / controller shape */}
          <rect x="140" y="28" width="70" height="38" rx="16" fill="#1a0a2e" stroke="#b44fff" strokeWidth="1.5" />
          {/* Left joystick */}
          <circle cx="158" cy="50" r="7" fill="#12123a" stroke="#7c3aed" strokeWidth="1" />
          <circle cx="158" cy="50" r="3.5" fill="#b44fff" />
          {/* Right buttons */}
          <circle cx="188" cy="46" r="4" fill="#ff2d8b33" stroke="#ff2d8b" strokeWidth="1" />
          <circle cx="196" cy="52" r="4" fill="#00f5ff33" stroke="#00f5ff" strokeWidth="1" />
          <circle cx="180" cy="52" r="4" fill="#ffd70033" stroke="#ffd700" strokeWidth="1" />
          <circle cx="188" cy="58" r="4" fill="#b44fff33" stroke="#b44fff" strokeWidth="1" />
          {/* D-pad */}
          <rect x="166" y="33" width="5" height="14" rx="1.5" fill="#2a2a6a" />
          <rect x="162" y="37" width="14" height="5" rx="1.5" fill="#2a2a6a" />
          {/* Shoulder bumpers */}
          <rect x="144" y="24" width="18" height="7" rx="3" fill="#12123a" stroke="#b44fff" strokeWidth="1" />
          <rect x="188" y="24" width="18" height="7" rx="3" fill="#12123a" stroke="#b44fff" strokeWidth="1" />
          {/* Screen/face in top center */}
          <rect x="162" y="16" width="26" height="16" rx="4" fill="#0a0a1e" stroke="#00f5ff" strokeWidth="1.5" />
          {/* Eyes */}
          <circle cx="170" cy="23" r="2.5" fill="#00f5ff" />
          <circle cx="180" cy="23" r="2.5" fill="#ff2d8b" />
          {/* Smile */}
          <path d="M168 28 Q175 32 182 28" stroke="#ffd700" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Antenna */}
          <line x1="175" y1="16" x2="175" y2="9" stroke="#b44fff" strokeWidth="1.5" />
          <circle cx="175" cy="7" r="2.5" fill="#ff2d8b" style={{ animation: "sparkle-float 1.5s ease-in-out 0.2s infinite" }} />
        </g>

        {/* Sparkles */}
        <Sparkle x={42} y={12} delay={0} size={5} />
        <Sparkle x={115} y={58} delay={0.7} size={4} />
        <Sparkle x={130} y={20} delay={1.4} size={3} />
        <Sparkle x={250} y={10} delay={0.3} size={5} />
        <Sparkle x={270} y={55} delay={1.1} size={4} />
        <Sparkle x={300} y={30} delay={0.8} size={3} />
        <Sparkle x={310} y={8} delay={1.8} size={4} />

        {/* Pixel decorations */}
        <rect x="40" y="30" width="3" height="3" fill="#00f5ff" opacity="0.6" />
        <rect x="46" y="35" width="3" height="3" fill="#ff2d8b" opacity="0.5" />
        <rect x="52" y="28" width="3" height="3" fill="#b44fff" opacity="0.6" />
        <rect x="260" y="36" width="3" height="3" fill="#00f5ff" opacity="0.6" />
        <rect x="266" y="28" width="3" height="3" fill="#ff2d8b" opacity="0.5" />
        <rect x="272" y="40" width="3" height="3" fill="#b44fff" opacity="0.6" />

        {/* Bottom decorative bar */}
        <rect x="40" y="68" width="240" height="1" fill="url(#bottomGrad)" opacity="0.5" />
        <defs>
          <linearGradient id="bottomGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#b44fff" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
