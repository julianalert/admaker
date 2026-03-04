-- Multi-brand: users can have multiple brands; each brand has one Brand DNA; campaigns belong to a brand.

-- 1. Create brands table (one per user initially; later users can add more)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  domain TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brands_user_id ON brands(user_id);

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brands"
  ON brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brands"
  ON brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON brands FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands"
  ON brands FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Add brand_id to brand_dna and migrate from user_id
ALTER TABLE brand_dna ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

-- Backfill: create one brand per user that has brand_dna, then link brand_dna to it
INSERT INTO brands (user_id, name, domain)
  SELECT bd.user_id, bd.name, bd.domain
  FROM (
    SELECT DISTINCT ON (user_id) user_id,
      COALESCE(p.brand_name, split_part(replace(replace(bd.website_url, 'https://', ''), 'http://', ''), '/', 1)) AS name,
      split_part(replace(replace(bd.website_url, 'https://', ''), 'http://', ''), '/', 1) AS domain
    FROM brand_dna bd
    LEFT JOIN profiles p ON p.id = bd.user_id
  ) bd
  WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.user_id = bd.user_id);

-- We need to set brand_id on brand_dna. One brand per user from the insert above.
UPDATE brand_dna bd
SET brand_id = b.id
FROM brands b
WHERE b.user_id = bd.user_id AND bd.brand_id IS NULL;

-- Drop old unique constraint and user_id, add unique on brand_id
ALTER TABLE brand_dna DROP CONSTRAINT IF EXISTS brand_dna_user_id_key;
ALTER TABLE brand_dna ALTER COLUMN brand_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS brand_dna_brand_id_key ON brand_dna(brand_id);

-- Drop RLS policies that depend on user_id BEFORE dropping the column
DROP POLICY IF EXISTS "Users can read own brand_dna" ON brand_dna;
DROP POLICY IF EXISTS "Users can insert own brand_dna" ON brand_dna;
DROP POLICY IF EXISTS "Users can update own brand_dna" ON brand_dna;
DROP POLICY IF EXISTS "Users can delete own brand_dna" ON brand_dna;

-- Now safe to drop user_id column
ALTER TABLE brand_dna DROP COLUMN IF EXISTS user_id;

-- Recreate RLS policies for brand_dna (access via brand ownership)
CREATE POLICY "Users can read own brand_dna"
  ON brand_dna FOR SELECT
  USING (EXISTS (SELECT 1 FROM brands b WHERE b.id = brand_dna.brand_id AND b.user_id = auth.uid()));

CREATE POLICY "Users can insert own brand_dna"
  ON brand_dna FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM brands b WHERE b.id = brand_dna.brand_id AND b.user_id = auth.uid()));

CREATE POLICY "Users can update own brand_dna"
  ON brand_dna FOR UPDATE
  USING (EXISTS (SELECT 1 FROM brands b WHERE b.id = brand_dna.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM brands b WHERE b.id = brand_dna.brand_id AND b.user_id = auth.uid()));

CREATE POLICY "Users can delete own brand_dna"
  ON brand_dna FOR DELETE
  USING (EXISTS (SELECT 1 FROM brands b WHERE b.id = brand_dna.brand_id AND b.user_id = auth.uid()));

-- Drop old index on user_id (column is gone)
DROP INDEX IF EXISTS idx_brand_dna_user_id;
CREATE INDEX IF NOT EXISTS idx_brand_dna_brand_id ON brand_dna(brand_id);

-- 3. Add brand_id to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

-- Backfill campaigns: create a brand for any user who has campaigns but no brand yet, then assign
INSERT INTO brands (user_id, name, domain)
  SELECT c.user_id, COALESCE((SELECT p.brand_name FROM profiles p WHERE p.id = c.user_id LIMIT 1), 'My brand'), COALESCE((SELECT p.brand_name FROM profiles p WHERE p.id = c.user_id LIMIT 1), 'my-brand')
  FROM (SELECT DISTINCT user_id FROM campaigns) c
  WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.user_id = c.user_id);

UPDATE campaigns c
SET brand_id = (SELECT b.id FROM brands b WHERE b.user_id = c.user_id LIMIT 1)
WHERE c.brand_id IS NULL;

ALTER TABLE campaigns ALTER COLUMN brand_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
