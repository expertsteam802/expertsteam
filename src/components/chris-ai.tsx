import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Code2, Copy, Loader2, Save, Send, Sparkles, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { askChrisAi } from "@/lib/ai.functions";

type ChatRow = { id: string; role: string; content: string; created_at: string };

function MessageBody({ content }: { content: string }) {
  const parts = content.split(/```/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <pre
            key={index}
            className="overflow-x-auto rounded-lg border border-border bg-background/80 p-3 text-xs"
          >
            <code>{part.replace(/^[a-zA-Z0-9+#-]*\n/, "")}</code>
          </pre>
        ) : (
          part.trim() && (
            <p key={index} className="whitespace-pre-wrap">
              {part.trim()}
            </p>
          )
        ),
      )}
    </div>
  );
}

export function ChrisAiChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ask = useServerFn(askChrisAi);
  const [input, setInput] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["ai-chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chats")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatRow[];
    },
  });

  const send = useMutation({
    mutationFn: async (prompt: string) => {
      await supabase.from("ai_chats").insert({ user_id: user!.id, role: "user", content: prompt });
      await queryClient.invalidateQueries({ queryKey: ["ai-chats", user?.id] });
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await ask({ data: { prompt, mode: "chat", history } });
      await supabase.from("ai_chats").insert({ user_id: user!.id, role: "ai", content: result.reply });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ai-chats", user?.id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_chats").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chat cleared");
      void queryClient.invalidateQueries({ queryKey: ["ai-chats", user?.id] });
    },
  });

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Bot className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-xl font-semibold">Sign in to chat with Chris AI</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your conversations are private and saved to your account.
        </p>
      </Card>
    );
  }

  function submit() {
    const prompt = input.trim();
    if (!prompt || send.isPending) return;
    setInput("");
    send.mutate(prompt);
  }

  return (
    <Card className="glow-panel flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Chris AI</p>
            <p className="text-xs text-muted-foreground">PC info · games · code</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Clear chat" onClick={() => clear.mutate()}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "Best budget gaming PC build under $700?",
              "Why is my laptop overheating while gaming?",
              "Write a React component for a countdown timer",
              "Explain Python lists vs tuples with examples",
            ].map((idea) => (
              <button
                key={idea}
                onClick={() => setInput(idea)}
                className="animate-rise rounded-lg border border-border bg-secondary/60 p-3 text-left text-sm transition-colors hover:border-primary/60"
              >
                {idea}
              </button>
            ))}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role !== "user" && (
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-secondary"
              }`}
            >
              <MessageBody content={message.content} />
            </div>
            {message.role === "user" && (
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary">
                <User className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        ))}
        {send.isPending && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Chris AI is thinking…
          </p>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border/70 p-3">
        <Textarea
          value={input}
          rows={1}
          placeholder="Ask Chris AI anything…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="min-h-10 resize-none"
        />
        <Button onClick={submit} disabled={send.isPending} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

type SnippetRow = {
  id: string;
  title: string;
  language: string;
  prompt: string | null;
  code: string;
  updated_at: string;
};

export function ChrisAiWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ask = useServerFn(askChrisAi);
  const [brief, setBrief] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [snippetId, setSnippetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: snippets = [] } = useQuery({
    queryKey: ["ai-snippets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_snippets")
        .select("id, title, language, prompt, code, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as SnippetRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("Nothing to save yet.");
      const payload = {
        user_id: user!.id,
        title: (title.trim() || brief.trim().slice(0, 60) || "Untitled snippet").slice(0, 120),
        prompt: brief.trim() ? brief.trim().slice(0, 2000) : null,
        code: code.slice(0, 40000),
      };
      if (snippetId) {
        const { error } = await supabase.from("ai_snippets").update(payload).eq("id", snippetId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("ai_snippets").insert(payload).select("id").single();
        if (error) throw error;
        setSnippetId(data.id);
      }
    },
    onSuccess: () => {
      toast.success("Progress saved");
      void queryClient.invalidateQueries({ queryKey: ["ai-snippets", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeSnippet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_snippets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (snippetId === id) setSnippetId(null);
      void queryClient.invalidateQueries({ queryKey: ["ai-snippets", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function load(snippet: SnippetRow) {
    setSnippetId(snippet.id);
    setTitle(snippet.title);
    setBrief(snippet.prompt ?? "");
    setCode(snippet.code);
  }

  async function generate() {
    if (!brief.trim()) return;
    setBusy(true);
    try {
      const result = await ask({ data: { prompt: brief.trim(), mode: "workspace" } });
      setCode(result.reply);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }


  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Code2 className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-xl font-semibold">Sign in to use the workspace</h2>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glow-panel space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Build brief</h2>
          <Input
            value={title}
            placeholder="Snippet name (e.g. map editor loader)"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            rows={7}
            value={brief}
            placeholder="Describe what to build: a Python game loop, an HTML landing page, a PC benchmark script…"
            onChange={(event) => setBrief(event.target.value)}
          />
          <Button onClick={() => void generate()} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate code
          </Button>
        </Card>
        <Card className="glow-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Workspace</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!code || save.isPending} onClick={() => save.mutate()}>
                <Save className="mr-2 h-3.5 w-3.5" /> {snippetId ? "Update" : "Save"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!code}
                onClick={() => {
                  void navigator.clipboard.writeText(code);
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
          <Textarea
            rows={16}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Generated code appears here and stays editable."
            className="font-mono text-xs"
          />
        </Card>
      </div>

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Saved progress</h2>
        {!snippets.length && (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet — generate code and hit Save to keep your progress in your account.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 p-3"
            >
              <button onClick={() => load(snippet)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{snippet.title}</p>
                <p className="text-xs text-muted-foreground">Updated {snippet.updated_at.slice(0, 10)}</p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${snippet.title}`}
                onClick={() => removeSnippet.mutate(snippet.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
