import { getTodayGame, getAllGames } from "@/lib/games";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  const today = getTodayGame();
  redirect(`/games/${today.slug}`);
}
