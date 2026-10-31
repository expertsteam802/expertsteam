import { afterEach, expect, test } from "bun:test";
import { runAgent } from "./agent.server";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const input = { prompt: "Build a game", files: {}, history: [] };

test("coding agent uses Gemini directly without a paid fallback", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (url) => {
    urls.push(String(url));
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ message: "Built", files: { "index.html": "<h1>Game</h1>" } }) }] } }] });
  }) as typeof fetch;
  const result = await runAgent(input, "test-key");
  expect(urls).toEqual(["https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"]);
  expect(result.files["index.html"]).toBe("<h1>Game</h1>");
});

test("free quota exhaustion never calls a paid fallback", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(null, { status: 429 }); }) as typeof fetch;
  await expect(runAgent(input, "test-key")).rejects.toThrow("free quota");
  expect(calls).toBe(1);
});

test("truncated generation cannot replace existing files", async () => {
  globalThis.fetch = (async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] })) as typeof fetch;
  await expect(runAgent(input, "test-key")).rejects.toThrow("files were not replaced");
});