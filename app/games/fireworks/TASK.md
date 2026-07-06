# Task Brief: Fireworks Catch — 4th of July Game

## Overview

Build a 4th of July-themed browser game called **Fireworks Catch**. The player controls a bucket at the bottom of the screen and catches falling fireworks before they hit the ground. Missing too many ends the game. The aesthetic is dark sky, glowing fireworks, patriotic color palette (red, white, blue, gold).

---

## File to Create

`app/games/fireworks/page.tsx`

This is a **Next.js App Router** page. Use the `"use client"` directive. No server-side logic needed.

---

## Gameplay

- The canvas/play area fills the available vertical space (aim for ~480px tall, ~360px wide, centered)
- Fireworks (colored glowing orbs) fall from the top at random horizontal positions
- The player controls a **bucket** at the bottom using:
  - Left/Right **arrow keys** (keyboard)
  - On-screen **← →** buttons (mobile)
- Catching a firework scores **+10 points** and triggers a brief sparkle burst at the bucket
- Missing a firework (it hits the bottom) costs **1 life** — player starts with **3 lives** (display as 🎆🎆🎆)
- Each life lost: flash the screen red briefly, show one fewer 🎆
- Game ends at 0 lives
- Difficulty ramps: fireworks fall faster and spawn more frequently as score increases (every 50 pts)

---

## Visual Style

Follow the existing game aesthetic (see `app/games/snake/page.tsx` for reference):

- Dark background: `#05071a` (deep midnight blue)
- Orbitron font for score/title (already loaded globally via layout)
- Firework colors (pick randomly): `#ff4444`, `#4488ff`, `#ffffff`, `#ffd700`, `#ff69b4`
- Glowing effect via `boxShadow` on orbs (same pattern as snake's food)
- Bucket: a simple rectangle in red/white/blue (patriotic), with a subtle glow
- Title: "FIREWORKS CATCH" in gold/yellow with a subtitle "🎆 Happy 4th of July! 🎆"
- Show score prominently; show lives as 🎆 emoji row

---

## Sparkle Effect

When a firework is caught, render 6–8 small colored dots that fly outward from the catch point and fade out over ~400ms. Use `useState` + `useEffect` with a short timeout to clear them. No canvas required — use absolute-positioned divs.

---

## Game Loop

Use `requestAnimationFrame` via `useRef` + `useEffect`. Keep game state in refs (not useState) for the hot path to avoid stale closures. Use `useState` only for React-rendered values (score, lives, status).

Firework objects:
```ts
type Firework = {
  id: number;
  x: number;      // 0–1 normalized (multiply by container width)
  y: number;      // 0–1 normalized (multiply by container height)
  speed: number;  // normalized units per frame
  color: string;
};
```

Bucket: track `bucketX` (0–1 normalized center), width = 15% of container.

---

## AI Integration

**No AI needed for this game.** `hasAI: false`.

---

## After Writing page.tsx

**Do NOT touch `lib/games.ts`** — Chef will handle the registry update separately.

---

## Code Quality

- TypeScript, no `any`
- Functional components only
- Clean up all intervals/RAF handles in `useEffect` returns
- Mobile-friendly: touch targets ≥ 44px, on-screen buttons clearly visible

---

## Reference Files

- Game structure: `app/games/snake/page.tsx`
- AI pattern (for reference only): `app/games/connectfour/page.tsx`
- Layout/font: `app/layout.tsx`
