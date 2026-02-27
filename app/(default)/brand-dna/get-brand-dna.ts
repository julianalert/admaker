import { createClient } from '@/lib/supabase/server'
import type { BrandDnaProfile } from '@/lib/brand-dna/types'

export type BrandDnaRow = {
  id: string
  website_url: string
  profile: BrandDnaProfile
  created_at: string
  updated_at: string
}

export async function getUserBrandDna(): Promise<BrandDnaRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('brand_dna')
    .select('id, website_url, profile, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as BrandDnaRow
}
