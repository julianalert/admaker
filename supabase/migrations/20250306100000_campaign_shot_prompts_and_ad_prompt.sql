-- Store the full list of shot prompts (ad_type + prompt) used for this campaign.
-- Set for creative and ultra modes when prompts are generated; order matches generated ads.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_shot_prompts JSONB;

COMMENT ON COLUMN campaigns.creative_shot_prompts IS 'Array of { ad_type, prompt } from Creative Director / ultra flow, in generation order.';

-- Store the exact prompt used to generate each ad (for transparency and debugging).
ALTER TABLE ads ADD COLUMN IF NOT EXISTS generation_prompt TEXT;

COMMENT ON COLUMN ads.generation_prompt IS 'The image generation prompt used to create this ad.';
