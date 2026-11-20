-- Trigger-only helpers should not be callable through the public API.
revoke execute on function public.sync_auth_user_profile() from public, anon, authenticated;
