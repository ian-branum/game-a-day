"use client";

import { getAllGames, GameMeta } from "@/lib/games";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import HeaderArt from "./HeaderArt";
import Countdown from "./Countdown";

function GameThumbnail({ game }: { game: GameMeta }) {
  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 relative overflow-hidden"
      style={{ background: `${game.color}22`, border: `1px solid ${game.color}55` }}
    >
      <span style={{ filter: "drop-shadow(0 0 4px currentColor)" }}>{game.emoji}</span>
    </div>
  );
}

function formatDate(d: string) {
  const [, m, day] = d.split("-");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m)]} ${parseInt(day)}`;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const games = getAllGames();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden relative z-10">

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a2e 0%, #1a0533 50%, #0a1a3e 100%)", borderBottom: "1px solid #2a2a6a" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #ff2d8b, #b44fff, #00f5ff, transparent)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00f5ff, #b44fff, #ff2d8b, transparent)" }} />
        </div>

        <div className="flex items-center gap-4 px-6 py-4 relative">
          <button className="lg:hidden text-2xl mr-2" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle sidebar">☰</button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "linear-gradient(135deg, #ff2d8b33, #b44fff33)", border: "1px solid #ff2d8b66" }}>
                🎮
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-500 animate-ping" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-500" />
            </div>
            <div>
              <h1 className="font-orbitron text-xl font-black leading-tight tracking-wider text-glow-pink" style={{ color: "#ff2d8b" }}>
                GAME OF THE DAY
              </h1>
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#00f5ff99" }}>
                A new classic game, every day — built by AI ✦ Browser-native ✦ No installs
              </p>
            </div>
          </div>

          {/* Anime SVG art */}
          <HeaderArt />
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          fixed lg:relative z-30 lg:z-auto
          w-72 h-full flex-shrink-0 flex flex-col
          transition-transform duration-200
        `}
          style={{ background: "linear-gradient(180deg, #0d0d2b 0%, #080818 100%)", borderRight: "1px solid #2a2a6a" }}>

          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a6a" }}>
            <p className="font-orbitron text-xs tracking-widest uppercase" style={{ color: "#b44fff" }}>
              ✦ Game Archive ✦
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            {games.map((game, i) => {
              const isActive = pathname === `/games/${game.slug}`;
              const isLatest = i === 0;
              return (
                <Link
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-all group ${isActive ? "sidebar-item-active" : "hover:bg-white/5"}`}
                  style={!isActive ? { borderLeft: "3px solid transparent" } : {}}
                >
                  <GameThumbnail game={game} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
                        {game.title}
                      </span>
                      {isLatest && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-orbitron flex-shrink-0"
                          style={{ background: "#ff2d8b22", color: "#ff2d8b", border: "1px solid #ff2d8b44" }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: "#00f5ff66" }}>{formatDate(game.addedDate)}</span>
                      {game.hasAI && <span className="text-xs" style={{ color: "#b44fff66" }}>vs AI</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Countdown teaser */}
          <div className="flex-shrink-0" style={{ borderTop: "1px solid #2a2a6a" }}>
            <Countdown />
          </div>

          <div className="px-4 py-2 flex-shrink-0 text-center">
            <p className="text-xs" style={{ color: "#ffffff22" }}>Built by AI · Powered by Ollama</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto relative scanlines" style={{ background: "#080818" }}>
          <div className="relative z-10 h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
