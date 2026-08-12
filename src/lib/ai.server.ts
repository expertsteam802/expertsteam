import { AI_SYSTEM_PROMPT, AI_WORKSPACE_PROMPT } from "@/lib/ai-prompt";

type AiInput = {
  prompt: string;
  mode: "chat" | "workspace";
  history: { role: string; content: string }[];
};

export async function runChrisAi({ prompt, mode, history }: AiInput): Promise<{ reply: string }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { reply: "Chris AI is not configured yet. Please try again later." };

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          { role: "system", content: mode === "workspace" ? AI_WORKSPACE_PROMPT : AI_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: prompt },
        ],
      }),
    });

    if (response.status === 429) {
      return { reply: "Chris AI is busy right now (rate limit reached). Please try again in a moment." };
    }
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      return { reply: "Chris AI could not answer that right now. Please try again." };
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    return { reply: reply || "Chris AI had nothing to say. Try rephrasing your question." };
  } catch (error) {
    console.error("AI gateway request failed", error);
    return { reply: "Chris AI is unreachable at the moment. Please try again." };
  }
}
