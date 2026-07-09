import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get("x-game-ai-secret");
  if (secret !== process.env.GAME_AI_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, game } = await req.json();
  const systemPrompt = game ? SYSTEM_PROMPTS[game] ?? "" : "";

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY not set");
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  try {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.2,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("game-ai error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
