type AgentInput = {
  prompt: string;
  files: Record<string, string>;
  history: { role: "user" | "assistant"; content: string }[];
};

const AGENT_PROMPT = `You are the Experts Team coding agent, built into the Experts Team website created by Chris Expert - M.Chris.T.
You build browser-based websites, dashboards, tools, and 2D/3D games made of multiple files (HTML, CSS, JavaScript, plus any extra files like README.md or data.json).
The app runs in a browser sandbox: index.html is the entry; reference local files with relative paths like "style.css" or "script.js". No build step, no npm. CDN scripts are allowed. Use browser libraries such as Three.js or Phaser when suitable. Make complete working apps, not placeholders. If asked for a framework requiring a build step or a native app, explain that this sandbox only executes browser-ready files; never claim a framework build has been tested.
Always reply with a JSON object: {"message": "short summary of what you did", "files": {"path": "full file content", ...}}.
Include ONLY files you created or changed, each with its FULL content. To delete a file set its value to null.
Always write the creator's name as "Chris" (never "Chriss").`;

export async function runAgent({ prompt, files, history }: AgentInput, apiKey?: string) {
  if (!apiKey) throw new Error("The site owner needs to connect a Gemini API key before using the agent.");

  const fileDump = Object.entries(files)
    .map(([name, content]) => `--- ${name} ---\n${content}`)
    .join("\n\n")
    .slice(0, 60000);

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AGENT_PROMPT }] },
      generationConfig: { responseMimeType: "application/json" },
      contents: [
        ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        { role: "user", parts: [{ text: `Current project files:\n${fileDump || "(empty)"}\n\nRequest: ${prompt}` }] },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (response.status === 429) throw new Error("Gemini's free quota or rate limit has been reached. Try again later; no paid AI fallback was used.");
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new Error("Gemini rejected this request. The site owner should check the API key and its Google AI Studio access.");
  }
  if (!response.ok) throw new Error("Gemini could not finish that request. Please try again.");
  const json = (await response.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const candidate = json.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini's answer was too large. Ask for a smaller change; your files were not replaced.");
  const text = candidate?.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("") ?? "";

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text) as {
      message?: string;
      files?: Record<string, string | null>;
    };
    if (!parsed.files || typeof parsed.files !== "object" || Array.isArray(parsed.files)) throw new Error("Invalid files");
    const output: Record<string, string | null> = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      if (typeof content !== "string" && content !== null) throw new Error("Invalid file content");
      output[path] = content;
    }
    return { message: typeof parsed.message === "string" ? parsed.message : "Done.", files: output };
  } catch {
    throw new Error("Gemini did not return complete app files. Try a smaller request; your existing files were not changed.");
  }
}

export async function pushToGithub({
  token,
  repo,
  files,
  message,
}: {
  token: string;
  repo: string;
  files: Record<string, string>;
  message: string;
}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "experts-team-agent",
  };
  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error(`GitHub rejected the token (${userRes.status}).`);
  const { login } = (await userRes.json()) as { login: string };

  const repoRes = await fetch(`https://api.github.com/repos/${login}/${repo}`, { headers });
  if (repoRes.status === 404) {
    const created = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: repo, auto_init: true, description: "Built with the Experts Team agent" }),
    });
    if (!created.ok) throw new Error(`Could not create repository: ${await created.text()}`);
  } else if (!repoRes.ok) {
    throw new Error(`GitHub error ${repoRes.status}`);
  }

  const allFiles: Record<string, string> = {
    ...files,
    ".github/workflows/deploy.yml": PAGES_WORKFLOW,
  };
  if (!allFiles["README.md"]) {
    allFiles["README.md"] = `# ${repo}\n\nBuilt with the Experts Team AI agent — creator Chris Expert (M.Chris.T).\n\nLive: https://${login}.github.io/${repo}/\n`;
  }
  for (const [path, content] of Object.entries(allFiles)) {
    const url = `https://api.github.com/repos/${login}/${repo}/contents/${encodeURI(path)}`;
    const existing = await fetch(url, { headers });
    const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;
    const bytes = new TextEncoder().encode(content);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const put = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ message, content: btoa(binary), sha }),
    });
    if (!put.ok) throw new Error(`Failed to push ${path}: ${put.status} ${await put.text()}`);
  }
  // Turn on GitHub Pages (deployed by the workflow). Ignore "already enabled".
  await fetch(`https://api.github.com/repos/${login}/${repo}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ build_type: "workflow" }),
  }).catch(() => undefined);
  return { url: `https://github.com/${login}/${repo}`, pagesUrl: `https://${login}.github.io/${repo}/` };
}

const PAGES_WORKFLOW = `name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: "."
      - id: deployment
        uses: actions/deploy-pages@v4
`;
