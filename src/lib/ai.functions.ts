import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runChrisAi } from "@/lib/ai.server";

export const askChrisAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; mode?: "chat" | "workspace"; history?: { role: string; content: string }[] }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (!prompt) throw new Error("Please type a message first.");
    if (prompt.length > 6000) throw new Error("That message is too long.");
    return {
      prompt,
      mode: input.mode === "workspace" ? ("workspace" as const) : ("chat" as const),
      history: (input.history ?? []).slice(-10).map((m) => ({
        role: m.role === "ai" || m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 4000),
      })),
    };
  })
  .handler(async ({ data }) => runChrisAi(data));
