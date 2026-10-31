type AgentInput = {
  prompt: string;
  files: Record<string, string>;
  history: { role: "user" | "assistant"; content: string }[];
};

const AGENT_PROMPT = `You are the Experts Team coding agent, built into the Experts Team website created by Chris Expert - M.Chris.T.
You build small web apps made of multiple files (HTML, CSS, JavaScript, plus any extra files like README.md or data.json).
The app runs in a browser sandbox: index.html is the entry; reference local files with relative paths like "style.css" or "script.js". No build step, no npm. CDN scripts are allowed.
Always reply with a JSON object: {"message": "short summary of what you did", "files": {"path": "full file content", ...}}.
Include ONLY files you created or changed, each with its FULL content. To delete a file set its value to null.
Always write the creator's name as "Chris" (never "Chriss").`;

export async function runAgent({ prompt, files, history }: AgentInput) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { message: "The agent is not configured yet.", files: {} };

  const fileDump = Object.entries(files)
    .map(([name, content]) => `--- ${name} ---\n${content}`)
    .join("\n\n")
    .slice(0, 60000);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AGENT_PROMPT },
        ...history,
        { role: "user", content: `Current project files:\n${fileDump || "(empty)"}\n\nRequest: ${prompt}` },
      ],
    }),
  });

  if (response.status === 429) return { message: "The agent is busy (rate limit). Try again in a moment.", files: {} };
  if (response.status === 402)
    return { message: "AI credits for this site are used up. The site owner needs to add credits.", files: {} };
  if (!response.ok || !response.body) {
    console.error("Agent gateway error", response.status, await response.text());
    return { message: "The agent could not finish that request. Please try again.", files: {} };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        text += json.choices?.[0]?.delta?.content ?? "";
      } catch {
        /* partial chunk */
      }
    }
  }

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text) as {
      message?: string;
      files?: Record<string, string | null>;
    };
    return { message: parsed.message ?? "Done.", files: parsed.files ?? {} };
  } catch {
    return { message: text.trim() || "The agent returned an empty answer.", files: {} };
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
