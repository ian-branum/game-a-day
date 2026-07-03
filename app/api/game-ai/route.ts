import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get("x-game-ai-secret");
  if (secret !== process.env.GAME_AI_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, game } = await req.json();
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const systemPrompt = game ? SYSTEM_PROMPTS[game] ?? "" : "";

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:8b",
        system: systemPrompt,
        prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response });
  } catch (err) {
    console.error("game-ai error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
