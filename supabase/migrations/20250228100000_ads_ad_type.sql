-- Add photo type to generated ads (studio, contextual, lifestyle, etc.) for display as badge
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_type TEXT;

COMMENT ON COLUMN ads.ad_type IS 'Photo type: studio, studio_2, contextual, lifestyle, creative, ugc_styler, cinematic. NULL for legacy or user-edited ads.';
