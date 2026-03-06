-- Grant 10 credits to new signups (was 5)
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
    CASE WHEN (NEW.raw_app_meta_data->>'provider' = 'google') THEN 10 ELSE 0 END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
