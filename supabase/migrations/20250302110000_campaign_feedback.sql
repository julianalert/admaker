-- Campaign feedback: 1–5 star rating per user per campaign (owner only)
CREATE TABLE campaign_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX idx_campaign_feedback_campaign_id ON campaign_feedback(campaign_id);
CREATE INDEX idx_campaign_feedback_user_id ON campaign_feedback(user_id);

ALTER TABLE campaign_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only view/insert/update their own feedback for their own campaigns
CREATE POLICY "Users can view own campaign feedback"
  ON campaign_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign feedback"
  ON campaign_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can update own campaign feedback"
  ON campaign_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER campaign_feedback_updated_at
  BEFORE UPDATE ON campaign_feedback
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
