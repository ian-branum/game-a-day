"use client";

export default function ThinkingOrbs({ label = "AI is thinking" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Orbital orb animation */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Center core */}
        <div className="w-4 h-4 rounded-full z-10"
          style={{ background: "#b44fff", boxShadow: "0 0 12px #b44fff, 0 0 24px #b44fff44" }} />
        {/* Orbiting dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="thinking-orb-1 w-full h-full absolute flex items-center justify-start">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff2d8b", boxShadow: "0 0 6px #ff2d8b" }} />
          </div>
          <div className="thinking-orb-2 w-full h-full absolute flex items-center justify-start">
            <div className="w-2 h-2 rounded-full" style={{ background: "#00f5ff", boxShadow: "0 0 6px #00f5ff" }} />
          </div>
          <div className="thinking-orb-3 w-full h-full absolute flex items-center justify-start">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ffd700", boxShadow: "0 0 6px #ffd700" }} />
          </div>
        </div>
      </div>
      <p className="font-orbitron text-xs tracking-widest uppercase" style={{ color: "#b44fff" }}>
        {label}
        <span className="animate-pulse">...</span>
      </p>
    </div>
  );
}
