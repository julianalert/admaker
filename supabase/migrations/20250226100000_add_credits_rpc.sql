-- Add credits (for Stripe purchase fulfillment). Only callable by service role.
-- Used by the webhook after checkout.session.completed.
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits int;
BEGIN
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'Amount must be at least 1';
  END IF;

  UPDATE public.profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;
  RETURN new_credits;
END;
$$;

-- Only service role can call this (webhook uses service role key)
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, int) TO service_role;
