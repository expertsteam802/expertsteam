CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'developer')
      OR EXISTS (SELECT 1 FROM public.project_requests WHERE user_id = _user_id AND status = 'approved');
$$;

CREATE TABLE public.workspace_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_groups TO authenticated;
GRANT ALL ON public.workspace_groups TO service_role;
ALTER TABLE public.workspace_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups readable by authenticated" ON public.workspace_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create groups" ON public.workspace_groups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = created_by);
CREATE POLICY "Admins update groups" ON public.workspace_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete groups" ON public.workspace_groups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER workspace_groups_updated_at BEFORE UPDATE ON public.workspace_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.workspace_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workspace_messages_group_idx ON public.workspace_messages (group_id, created_at);
ALTER TABLE public.workspace_messages ADD CONSTRAINT workspace_messages_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
GRANT SELECT, INSERT, DELETE ON public.workspace_messages TO authenticated;
GRANT ALL ON public.workspace_messages TO service_role;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read workspace messages" ON public.workspace_messages FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));
CREATE POLICY "Members post workspace messages" ON public.workspace_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(auth.uid()));
CREATE POLICY "Delete own workspace messages" ON public.workspace_messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled snippet',
  language text NOT NULL DEFAULT 'text',
  prompt text,
  code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_snippets TO authenticated;
GRANT ALL ON public.ai_snippets TO service_role;
ALTER TABLE public.ai_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own snippets" ON public.ai_snippets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own snippets" ON public.ai_snippets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own snippets" ON public.ai_snippets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own snippets" ON public.ai_snippets FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_snippets_updated_at BEFORE UPDATE ON public.ai_snippets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();