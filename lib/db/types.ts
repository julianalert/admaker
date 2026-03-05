/**
 * Database types for Admaker (Supabase).
 * Matches schema in supabase/migrations/.
 */

export type CampaignStatus = 'draft' | 'generating' | 'completed' | 'failed'
export type AdStatus = 'pending' | 'generating' | 'completed' | 'failed'

/** Creative Strategy & Brief shape stored in campaigns.creative_brief (matches gemini CreativeStrategyBrief). */
export type CreativeBriefVisualWorld = {
  environment: string
  surfacesAndMaterials: string
  colorPalette: string
  lightingConditions: string
  cameraStyle: string
  mood: string
}
export type CreativeStrategyBriefDb = {
  visualWorld: CreativeBriefVisualWorld
  shotList: Array<{ ad_type: string; description: string }>
  colorGrading?: string
  creativeDirection?: string
}

export interface Profile {
  id: string
  brand_name: string | null
  credits: number
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  user_id: string
  name: string | null
  domain: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  brand_id: string
  name: string | null
  product_name: string | null
  status: CampaignStatus
  /** Creative Strategy & Brief from Creative Director (visual world, shot list, etc.). Set when generation uses creative mode. */
  creative_brief?: CreativeStrategyBriefDb | null
  /** Full list of shot prompts { ad_type, prompt } in generation order. Set for creative/ultra modes. */
  creative_shot_prompts?: Array<{ ad_type: string; prompt: string }> | null
  created_at: string
  updated_at: string
}

export interface CampaignPhoto {
  id: string
  campaign_id: string
  storage_path: string
  order_index: number
  created_at: string
}

export interface Ad {
  id: string
  campaign_id: string
  storage_path: string | null
  format: string | null
  status: AdStatus
  /** The image generation prompt used to create this ad. */
  generation_prompt?: string | null
  created_at: string
  updated_at: string
}

/** Campaign with relations (for detail views) */
export interface CampaignWithPhotos extends Campaign {
  campaign_photos: CampaignPhoto[]
}

export interface CampaignWithPhotosAndAds extends CampaignWithPhotos {
  ads: Ad[]
}
