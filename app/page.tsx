import { getTodayGame } from "@/lib/games";
import { redirect } from "next/navigation";

export default function Home() {
  const today = getTodayGame();
  redirect(`/games/${today.slug}`);
}
