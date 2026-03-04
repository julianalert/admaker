'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const CURRENT_BRAND_ID_COOKIE = 'current_brand_id'

export type BrandRow = {
  id: string
  user_id: string
  name: string | null
  domain: string
  created_at: string
  updated_at: string
}

/** List all brands for the current user. */
export async function getBrands(): Promise<BrandRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('brands')
    .select('id, user_id, name, domain, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as BrandRow[]
}

/** Number of brands for the current user (for middleware). */
export async function getBrandCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('brands')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (error) return 0
  return count ?? 0
}

/** Get a single brand by id if it belongs to the current user. */
export async function getBrand(brandId: string): Promise<BrandRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('brands')
    .select('id, user_id, name, domain, created_at, updated_at')
    .eq('id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as BrandRow
}

/** Get the first brand id for the current user (for campaign creation when no brand selector). Uses current_brand_id cookie when set and valid. */
export async function getDefaultBrandId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const brandId = cookieStore.get(CURRENT_BRAND_ID_COOKIE)?.value
  if (brandId) {
    const { data } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) return data.id
  }

  const { data } = await supabase
    .from('brands')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}
