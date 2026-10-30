GRANT INSERT, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "Admins add roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

CREATE TABLE public.team_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Developer',
  email text,
  phone text,
  link text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_contacts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.team_contacts TO authenticated;
GRANT ALL ON public.team_contacts TO service_role;
ALTER TABLE public.team_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts public read" ON public.team_contacts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage contacts" ON public.team_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.team_contacts (name, role, email, link, sort_order) VALUES
  ('Chris Expert - M.Chris.T', 'Creator & Founder', 'mucyochristhecla@gmail.com', 'https://www.youtube.com/@expertchris', 0);

CREATE TABLE public.agent_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled app',
  files jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  slug text UNIQUE,
  github_repo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_projects TO authenticated;
GRANT ALL ON public.agent_projects TO service_role;
ALTER TABLE public.agent_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published apps are public" ON public.agent_projects FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Owners read own apps" ON public.agent_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create apps" ON public.agent_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update apps" ON public.agent_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins delete apps" ON public.agent_projects FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.touch_agent_project() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER agent_projects_touch BEFORE UPDATE ON public.agent_projects FOR EACH ROW EXECUTE FUNCTION public.touch_agent_project();

UPDATE public.site_settings SET site_name = 'Experts Team', tagline = 'Build. Create. Ship together.' WHERE id = 1;