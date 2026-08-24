REVOKE EXECUTE ON FUNCTION public.redeem_invite(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;