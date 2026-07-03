export interface GameMeta {
  slug: string;
  title: string;
  description: string;
  addedDate: string; // YYYY-MM-DD
  hasAI: boolean;
  emoji: string;
  color: string; // tailwind bg class for thumbnail
}

export const GAMES: GameMeta[] = [
  {
    slug: "snake",
    title: "Snake",
    description: "Eat, grow, don't crash. Classic arcade.",
    addedDate: "2026-06-29",
    hasAI: false,
    emoji: "🐍",
    color: "#16a34a",
  },
  {
    slug: "minesweeper",
    title: "Minesweeper",
    description: "Clear the minefield without triggering a bomb.",
    addedDate: "2026-06-30",
    hasAI: false,
    emoji: "💣",
    color: "#ca8a04",
  },
  {
    slug: "connectfour",
    title: "Connect Four",
    description: "Drop pieces to connect four in a row. You vs. AI.",
    addedDate: "2026-07-01",
    hasAI: true,
    emoji: "🔴",
    color: "#1d4ed8",
  },
  {
    slug: "tictactoe",
    title: "Tic-Tac-Toe",
    description: "The classic 3×3 grid game. You vs. AI.",
    addedDate: "2026-07-02",
    hasAI: true,
    emoji: "⭕",
    color: "#7c3aed",
  },
  {
    slug: "2048",
    title: "2048",
    description: "Slide tiles and merge your way to 2048. Play solo or watch AI.",
    addedDate: "2026-07-03",
    hasAI: true,
    emoji: "🟨",
    color: "#ca8a04",
  },
];

export function getTodayGame(): GameMeta {
  return GAMES[GAMES.length - 1];
}

export function getAllGames(): GameMeta[] {
  return [...GAMES].reverse();
}
