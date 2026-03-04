-- Store the Creative Director's Strategy & Brief (visual world, shot types, color grading, etc.) per campaign.
-- Set when a creative-mode photoshoot runs; null for ultra/single or if brief creation failed.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_brief JSONB;

COMMENT ON COLUMN campaigns.creative_brief IS 'Creative Strategy & Brief from AI Creative Director: { visualWorld, shotList, colorGrading?, creativeDirection? }. Set for mode=creative when brief is generated.';
