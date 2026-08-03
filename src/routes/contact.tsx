import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, Youtube } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Chris Programs" },
      {
        name: "description",
        content:
          "Reach Chris Expert by email, YouTube or Instagram for collaborations, questions and project ideas.",
      },
      { property: "og:title", content: "Contact Chris Programs" },
      { property: "og:description", content: "Get in touch with Chris Expert." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const settings = useSiteSettings();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${settings.owner_email}?subject=${encodeURIComponent(
    subject.slice(0, 120) || "Chris Programs enquiry",
  )}&body=${encodeURIComponent(`${message.slice(0, 2000)}\n\n— ${name.slice(0, 80)}`)}`;

  return (
    <PageShell>
      <section className="hero-surface border-b border-border/60 px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            Let's <span className="brand-text">talk</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Collaborations, questions, bug reports or project ideas — send them over.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1.2fr_1fr]">
        <Card className="animate-rise gap-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Your name</Label>
            <Input
              id="contact-name"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-subject">Subject</Label>
            <Input
              id="contact-subject"
              maxLength={120}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              rows={6}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <a href={mailto}>
            <Button disabled={!message.trim()}>Send message</Button>
          </a>
        </Card>

        <Card className="animate-rise gap-4 p-6">
          <h2 className="font-display text-lg font-semibold">Direct channels</h2>
          <a
            href={`mailto:${settings.owner_email}`}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-secondary"
          >
            <Mail className="h-4 w-4 text-primary" /> {settings.owner_email}
          </a>
          <a
            href={settings.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-secondary"
          >
            <Youtube className="h-4 w-4 text-primary" /> @expertchris
          </a>
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-secondary"
          >
            <Instagram className="h-4 w-4 text-primary" /> @m.chris_t2011
          </a>
        </Card>
      </section>
    </PageShell>
  );
}
