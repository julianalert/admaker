-- Add credits to profiles (default 0; new Google users get 5 via trigger)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 0;

-- Create profile on signup and grant 5 credits for first-time Google sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  VALUES (
    NEW.id,
    CASE WHEN (NEW.raw_app_meta_data->>'provider' = 'google') THEN 5 ELSE 0 END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: after a new auth.users row is inserted, create profile with credits
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: ensure existing Google auth users without a profile get one with 5 credits (runs once)
CREATE OR REPLACE FUNCTION public.backfill_profiles_google_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  SELECT u.id, 5
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
    AND (u.raw_app_meta_data->>'provider' = 'google')
  ON CONFLICT (id) DO NOTHING;
END;
$$;
SELECT public.backfill_profiles_google_credits();
DROP FUNCTION public.backfill_profiles_google_credits();
