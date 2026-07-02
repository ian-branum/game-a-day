export interface GameMeta {
  slug: string;
  title: string;
  description: string;
  addedDate: string; // YYYY-MM-DD
  hasAI: boolean;
}

export const GAMES: GameMeta[] = [
  {
    slug: "tictactoe",
    title: "Tic-Tac-Toe",
    description: "The classic 3×3 grid game. You vs. AI.",
    addedDate: "2026-07-02",
    hasAI: true,
  },
];

export function getTodayGame(): GameMeta {
  return GAMES[GAMES.length - 1];
}

export function getAllGames(): GameMeta[] {
  return [...GAMES].reverse();
}
