import { getAllGames } from "@/lib/games";
import Link from "next/link";

export default function GamesArchive() {
  const games = getAllGames();

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🎮 Game Archive</h1>
        <p className="text-gray-400 mb-8">Every game, newest first.</p>
        <div className="flex flex-col gap-4">
          {games.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="block bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-5 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{game.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">{game.description}</p>
                </div>
                <span className="text-xs text-gray-500 mt-1">{game.addedDate}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
