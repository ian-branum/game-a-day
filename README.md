# Game-a-Day 🎮

A daily browser game project. One new game ships every day (or close to it).

**Live:** https://game-a-day-one.vercel.app  
**Stack:** Next.js (App Router), TypeScript, Tailwind, Ollama (Llama 3 8b on VPS) for AI games  
**Repo:** ian-branum/game-a-day  

---

## How to Add a New Game

This is a recurring workflow. Follow these steps every time.

### 1. Create the game directory

```
app/games/<slug>/
  page.tsx      ← the game (you write this)
  TASK.md       ← the spec brief (Chef writes this, goes with the game)
```

### 2. Write `page.tsx`

- Must begin with `"use client";`
- Self-contained React component — no external game libraries
- Use `requestAnimationFrame` via `useRef` + `useEffect` for game loops
- Keep hot-path state in **refs**, use `useState` only for React-rendered values (score, lives, status)
- Clean up all RAF handles and timeouts in `useEffect` return functions
- For AI games: call `/api/game-ai` (see `connectfour/page.tsx` for pattern)

**Style rules:**
- Dark background: `#05071a` or similar deep dark
- Orbitron font for title/score (globally loaded — just use `font-orbitron` class)
- Glowing effects via `boxShadow` on colored elements
- Mobile controls: on-screen buttons, touch targets ≥ 44px
- Pattern reference: `app/games/snake/page.tsx` (no AI), `app/games/connectfour/page.tsx` (with AI)

### 3. Register in `lib/games.ts`

Add an entry to the `GAMES` array:

```ts
{
  slug: "mygame",          // matches app/games/<slug>/
  title: "My Game",
  description: "One sentence. What it is, how it plays.",
  addedDate: "2026-07-07", // YYYY-MM-DD
  hasAI: false,            // true if it calls /api/game-ai
  emoji: "🎮",
  color: "#1e1b4b",        // hex, used for thumbnail background
}
```

`getTodayGame()` returns the last entry — newest game auto-becomes today's game.

### 4. Commit and push

```bash
git add app/games/<slug>/ lib/games.ts
git commit -m "feat: add <Game Name> 🎮"
git push
```

Vercel auto-deploys on push to `main`.

---

## AI Games

AI games call the `/api/game-ai` route, which proxies to Ollama (Llama 3 8b) on the VPS.

- Include header: `x-game-ai-secret: <NEXT_PUBLIC_GAME_AI_SECRET>`
- POST body: `{ prompt: string, game: string }`
- Response: `{ response: string }` — parse out the move yourself (AI output is messy)
- Always have a fallback if AI is unavailable (catch block → default move)
- Set `hasAI: true` in games registry

---

## Repo Structure

```
app/
  page.tsx              ← landing page (redirects to today's game)
  games/
    layout.tsx          ← shared game shell (nav, back button, etc.)
    page.tsx            ← game listing page
    <slug>/
      page.tsx          ← the game
      TASK.md           ← spec brief (Chef-authored, for reference)
components/
  ThinkingOrbs.tsx      ← loading spinner used in AI games
lib/
  games.ts              ← game registry (source of truth for slugs, titles, dates)
```

---

## Agent Workflow

Games are built by the AI dev team:

1. **Chef** reads the repo, designs the game, writes `TASK.md` spec
2. **Chef** sends the task to a Qwen coder agent via `sessions_send(sessionKey: "agent:full-stack-dev:main", ...)`
   - ⚠️ Do NOT use `sessions_spawn` — that always uses Claude (expensive). Use `sessions_send` to route to local Qwen.
3. **Qwen coder** writes `page.tsx` (and any engine files) — does NOT touch `lib/games.ts`
4. **Chef** verifies output, updates `lib/games.ts`, commits and pushes

The repo is cloned at `/home/agentuser/game-a-day` on the VPS. At session start, `git pull` to get latest before making changes.

---

## Credentials

Stored in: `/home/agentuser/.openclaw/workspace/agents/chef/.env.game-a-day`

- `GAME_A_DAY_GITHUB_TOKEN` — fine-grained PAT (Contents + PRs R/W)
- `GAME_AI_SECRET` — shared secret for `/api/game-ai` route
- Also needs to be set in Vercel env vars as `NEXT_PUBLIC_GAME_AI_SECRET`
