/**
 * Database types for Admaker (Supabase).
 * Matches schema in supabase/migrations/.
 */

export type CampaignStatus = 'draft' | 'generating' | 'completed' | 'failed'
export type AdStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface Profile {
  id: string
  brand_name: string | null
  credits: number
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string | null
  product_name: string | null
  status: CampaignStatus
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
