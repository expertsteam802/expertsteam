ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_credits integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS ai_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_bytes bigint NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ai_subscription_price numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS ai_subscription_credits integer NOT NULL DEFAULT 500;

ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'storage';

CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  role text NOT NULL DEFAULT 'developer',
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_roles TO authenticated;
GRANT ALL ON public.workspace_roles TO service_role;
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team roles readable by members" ON public.workspace_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage team roles" ON public.workspace_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.invite_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text,
  created_by uuid,
  bonus_bytes bigint NOT NULL DEFAULT 52428800,
  ai_credits integer NOT NULL DEFAULT 25,
  max_uses integer NOT NULL DEFAULT 25,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_links TO authenticated;
GRANT ALL ON public.invite_links TO service_role;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invite links" ON public.invite_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id uuid NOT NULL REFERENCES public.invite_links ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, user_id)
);
GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their redemptions" ON public.invite_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invite_links;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to redeem an invite.';
  END IF;

  SELECT * INTO v_invite FROM public.invite_links
    WHERE lower(code) = lower(trim(_code)) AND active FOR UPDATE;
  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'That invite code is not valid.';
  END IF;
  IF v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'That invite code has already been used up.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invite_redemptions WHERE invite_id = v_invite.id AND user_id = v_user) THEN
    RAISE EXCEPTION 'You already redeemed this invite code.';
  END IF;

  INSERT INTO public.invite_redemptions (invite_id, user_id) VALUES (v_invite.id, v_user);
  UPDATE public.invite_links SET uses = uses + 1 WHERE id = v_invite.id;
  UPDATE public.profiles
    SET storage_quota_bytes = storage_quota_bytes + v_invite.bonus_bytes,
        bonus_bytes = bonus_bytes + v_invite.bonus_bytes,
        ai_credits = ai_credits + v_invite.ai_credits
    WHERE id = v_user;

  RETURN json_build_object('bonus_bytes', v_invite.bonus_bytes, 'ai_credits', v_invite.ai_credits);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;