-- Prevent duplicate ads when cron and client run doOneGenerationStep concurrently.
-- Slot is reserved by inserting with generation_index; second inserter gets unique violation and skips.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS generation_index INT;
COMMENT ON COLUMN ads.generation_index IS '0-based index of this ad in generation order; used to reserve slot before image generation. NULL for legacy or user-uploaded ads.';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ads_campaign_generation_index
  ON ads (campaign_id, generation_index) WHERE generation_index IS NOT NULL;
