import { createClient } from '@/lib/supabase/server'
import type { BrandDnaProfile } from '@/lib/brand-dna/types'

export type BrandDnaRow = {
  id: string
  brand_id: string
  website_url: string
  profile: BrandDnaProfile
  created_at: string
  updated_at: string
}

/** Get Brand DNA for a specific brand (must belong to current user). */
export async function getBrandDnaForBrand(brandId: string): Promise<BrandDnaRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('brand_dna')
    .select('id, brand_id, website_url, profile, created_at, updated_at')
    .eq('brand_id', brandId)
    .maybeSingle()

  if (error || !data) return null
  // Ensure user owns the brand
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!brand) return null
  return data as BrandDnaRow
}

/** Get the first brand's Brand DNA for the current user (for single-brand or default UX). */
export async function getUserBrandDna(brandId?: string): Promise<BrandDnaRow | null> {
  if (brandId) return getBrandDnaForBrand(brandId)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!brand) return null
  return getBrandDnaForBrand(brand.id)
}
