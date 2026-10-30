import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushToGithub, runAgent } from "@/lib/agent.server";

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { prompt: string; files: Record<string, string>; history?: { role: string; content: string }[] }) => {
      const prompt = String(input?.prompt ?? "").trim();
      if (!prompt) throw new Error("Tell the agent what to build.");
      if (prompt.length > 6000) throw new Error("That request is too long.");
      const files: Record<string, string> = {};
      for (const [k, v] of Object.entries(input.files ?? {}).slice(0, 40)) files[String(k).slice(0, 120)] = String(v);
      return {
        prompt,
        files,
        history: (input.history ?? []).slice(-8).map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content).slice(0, 3000),
        })),
      };
    },
  )
  .handler(async ({ data }) => runAgent(data));

export const pushProjectToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string; repo: string; files: Record<string, string> }) => {
    const token = String(input?.token ?? "").trim();
    const repo = String(input?.repo ?? "").trim();
    if (!token) throw new Error("Paste a GitHub access token.");
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(repo)) throw new Error("Repository name can use letters, numbers, - _ .");
    return { token, repo, files: input.files ?? {} };
  })
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await pushToGithub({ ...data, message: "Update from Experts Team agent" })) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Push failed" };
    }
  });
