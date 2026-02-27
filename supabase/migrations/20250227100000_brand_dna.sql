-- Brand DNA: one profile per user, generated from website URL (ScrapingBee + OpenAI)
CREATE TABLE IF NOT EXISTS brand_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  -- Full profile as JSON for flexibility (audience, problem, language, etc.)
  profile JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_brand_dna_user_id ON brand_dna(user_id);

CREATE TRIGGER brand_dna_updated_at
  BEFORE UPDATE ON brand_dna
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE brand_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brand_dna"
  ON brand_dna FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand_dna"
  ON brand_dna FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand_dna"
  ON brand_dna FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand_dna"
  ON brand_dna FOR DELETE
  USING (auth.uid() = user_id);
