-- Favorite ads: users can mark generated ads as favorites (for later use)
CREATE TABLE ad_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ad_id)
);

CREATE INDEX idx_ad_favorites_user_id ON ad_favorites(user_id);
CREATE INDEX idx_ad_favorites_ad_id ON ad_favorites(ad_id);

ALTER TABLE ad_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view own ad favorites"
  ON ad_favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add a favorite only for an ad that belongs to one of their campaigns
CREATE POLICY "Users can add favorite for own campaign ad"
  ON ad_favorites FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM ads a
      JOIN campaigns c ON c.id = a.campaign_id
      WHERE a.id = ad_id AND c.user_id = auth.uid()
    )
  );

-- Users can remove their own favorites
CREATE POLICY "Users can delete own ad favorites"
  ON ad_favorites FOR DELETE
  USING (auth.uid() = user_id);
