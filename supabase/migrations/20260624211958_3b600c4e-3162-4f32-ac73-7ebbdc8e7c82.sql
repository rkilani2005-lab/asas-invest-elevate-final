
REVOKE EXECUTE ON FUNCTION public.expire_outdated_properties() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_properties() TO postgres, service_role;
