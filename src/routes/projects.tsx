import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Developers — apply to build with Chris | Chris Programs" },
      {
        name: "description",
        content:
          "Apply to join the Chris Programs developer team, pitch your skills and get accepted to discuss real projects.",
      },
      { property: "og:title", content: "Developers — apply to build with Chris" },
      {
        property: "og:description",
        content: "Send a project request, get reviewed by Chris and join the developer workspace.",
      },
    ],
  }),
  component: ProjectsPage,
});

type ProjectRequest = {
  id: string;
  title: string;
  summary: string;
  skills: string | null;
  contact: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  declined: XCircle,
};

function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [contact, setContact] = useState("");

  const { data: requests = [] } = useQuery({
    queryKey: ["project-requests", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_requests")
        .select("id, title, summary, skills, contact, status, admin_note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectRequest[];
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to apply.");
      if (title.trim().length < 3) throw new Error("Give your application a title.");
      if (summary.trim().length < 20) throw new Error("Tell Chris a bit more about your project (20+ characters).");
      const { error } = await supabase.from("project_requests").insert({
        user_id: user.id,
        title: title.trim().slice(0, 120),
        summary: summary.trim().slice(0, 4000),
        skills: skills.trim() ? skills.trim().slice(0, 300) : null,
        contact: contact.trim() ? contact.trim().slice(0, 200) : null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent — Chris will review it in the dashboard.");
      setTitle("");
      setSummary("");
      setSkills("");
      setContact("");
      void queryClient.invalidateQueries({ queryKey: ["project-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approved = requests.some((request) => request.status === "approved");

  return (
    <PageShell>
      <section className="hero-surface border-b border-border/60 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="animate-rise font-display text-3xl font-bold sm:text-4xl">
            Build with <span className="brand-text">Chris</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Apply as a developer, share what you can build, and once Chris accepts your request you get
            the developer workspace to discuss projects, join group chats and ship together.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1.1fr_1fr]">
        <Card className="animate-rise gap-4 p-6 glow-panel">
          <h2 className="font-display text-xl font-semibold">Developer application</h2>
          {user ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="pr-title">Title</Label>
                <Input
                  id="pr-title"
                  placeholder="Unity game developer"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-summary">What do you want to build?</Label>
                <Textarea
                  id="pr-summary"
                  rows={5}
                  placeholder="Describe your project idea or the work you want to join."
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-skills">Skills</Label>
                <Input
                  id="pr-skills"
                  placeholder="React, Python, C#, design…"
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-contact">Contact (email, WhatsApp, Instagram)</Label>
                <Input
                  id="pr-contact"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                />
              </div>
              <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
                Send application
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in to send a developer application to Chris.
              </p>
              <Link to="/auth">
                <Button>Sign in to apply</Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Your requests</h2>
          {approved && (
            <Card className="gap-2 border-primary/50 p-4">
              <p className="text-sm font-medium">You are an accepted developer 🎉</p>
              <p className="text-xs text-muted-foreground">
                Head to the community feed to open project discussions and group threads with Chris.
              </p>
              <Link to="/community">
                <Button size="sm" variant="secondary">
                  Open developer discussions
                </Button>
              </Link>
            </Card>
          )}
          {requests.map((request) => {
            const Icon = STATUS_ICON[request.status] ?? Clock;
            return (
              <Card key={request.id} className="gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{request.title}</p>
                  <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {request.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{request.summary}</p>
                <p className="text-xs text-muted-foreground">Sent {formatDate(request.created_at)}</p>
                {request.admin_note && (
                  <p className="rounded-md bg-secondary p-2 text-xs">Chris: {request.admin_note}</p>
                )}
              </Card>
            );
          })}
          {user && !requests.length && (
            <p className="text-sm text-muted-foreground">No applications yet — send your first one.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
