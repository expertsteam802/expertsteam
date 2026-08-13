import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join — Chris Programs" },
      {
        name: "description",
        content:
          "Create your Chris Programs account with email or Google to upload files, watch videos and join the community.",
      },
      { property: "og:title", content: "Sign in or join — Chris Programs" },
      { property: "og:description", content: "Join the Chris Programs creator community." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const challenge = useMemo(() => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    return { a, b, sum: a + b };
  }, []);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function signIn(): Promise<void> {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
  }

  async function signUp(): Promise<void> {
    if (Number(answer) !== challenge.sum) {
      toast.error("Please answer the verification question.");
      return;
    }
    if (password.length < 6) {
      toast.error("Use at least 6 characters for your password.");
      return;
    }
    if (username.trim().length < 3) {
      toast.error("Pick a username with at least 3 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username: username.trim(), display_name: username.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      toast.success("Check your email to confirm your account.");
      return;
    }
    toast.success("Account created!");
  }

  async function verifyCode(): Promise<void> {
    if (code.trim().length < 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "signup",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email verified — welcome to Chris Programs!");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  }

  return (
    <PageShell>
      <div className="hero-surface min-h-[80vh] px-4 py-16">
        <Card className="animate-rise mx-auto w-full max-w-md p-8 glow-panel">
          <h1 className="font-display text-2xl font-semibold">Welcome to Chris Programs</h1>
          <p className="text-sm text-muted-foreground">
            The very first account created becomes the creator/admin of this site.
          </p>

          <Button variant="secondary" className="mt-4 w-full" onClick={() => void google()}>
            Continue with Google
          </Button>

          <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => void signIn()} disabled={busy}>
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              {emailSent ? (
                <p className="rounded-lg border border-border bg-secondary p-4 text-sm">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                  account, then sign in.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      maxLength={24}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-captcha">
                      Bot check: what is {challenge.a} + {challenge.b}?
                    </Label>
                    <Input
                      id="signup-captcha"
                      inputMode="numeric"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={() => void signUp()} disabled={busy}>
                    Create account
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </PageShell>
  );
}
