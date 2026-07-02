import { getAllGames } from "@/lib/games";
import Link from "next/link";

export default function GamesArchive() {
  const games = getAllGames();
  return (
    <div className="flex items-center justify-center h-full p-8 text-center">
      <div>
        <p className="font-orbitron text-2xl font-bold mb-2" style={{ color: "#ff2d8b" }}>
          ← Select a game
        </p>
        <p className="text-gray-500 text-sm">{games.length} games in the archive</p>
      </div>
    </div>
  );
}
