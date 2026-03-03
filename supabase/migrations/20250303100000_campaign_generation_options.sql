-- Store generation params so we can run image generation in background after returning campaignId early
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS generation_options JSONB;

COMMENT ON COLUMN campaigns.generation_options IS 'Options for background generation: { mode: "creative"|"ultra"|"single", format, photoCount?, customPrompt? }';
