-- Row Level Security: users can only access their own campaigns, photos, and ads

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Campaigns: full CRUD for own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Campaign photos: access via campaign ownership
CREATE POLICY "Users can view photos of own campaigns"
  ON campaign_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_photos.campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos for own campaigns"
  ON campaign_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_photos.campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from own campaigns"
  ON campaign_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_photos.campaign_id AND c.user_id = auth.uid()
    )
  );

-- Ads: access via campaign ownership
CREATE POLICY "Users can view ads of own campaigns"
  ON ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = ads.campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ads for own campaigns"
  ON ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = ads.campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ads of own campaigns"
  ON ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = ads.campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ads from own campaigns"
  ON ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = ads.campaign_id AND c.user_id = auth.uid()
    )
  );
