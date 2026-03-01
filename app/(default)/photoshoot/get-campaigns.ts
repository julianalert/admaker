import { createClient } from '@/lib/supabase/server'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

export type CampaignListItem = {
  id: string
  created_at: string
  imageUrl: string | null
}

/** Returns the number of campaigns for the current user. Returns 0 if not signed in. */
export async function getCampaignCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0
  const { count, error } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (error) return 0
  return count ?? 0
}

export async function getUserCampaignsWithImageUrls(): Promise<CampaignListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (campaignsError || !campaigns?.length) return []

  const campaignIds = campaigns.map((c) => c.id)
  const { data: ads } = await supabase
    .from('ads')
    .select('id, campaign_id, storage_path')
    .in('campaign_id', campaignIds)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })

  // First ad per campaign (by created_at)
  const firstAdByCampaign = new Map<string, { storage_path: string }>()
  for (const ad of ads ?? []) {
    if (!firstAdByCampaign.has(ad.campaign_id)) {
      firstAdByCampaign.set(ad.campaign_id, { storage_path: ad.storage_path! })
    }
  }

  const result: CampaignListItem[] = []
  const signedUrlPromises = campaigns.map(async (campaign) => {
    const ad = firstAdByCampaign.get(campaign.id)
    let imageUrl: string | null = null
    if (ad) {
      const { data: signed } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .createSignedUrl(ad.storage_path, SIGNED_URL_EXPIRY)
      imageUrl = signed?.signedUrl ?? null
    }
    return {
      id: campaign.id,
      created_at: campaign.created_at,
      imageUrl,
    }
  })
  return Promise.all(signedUrlPromises)
}

const DEFAULT_PAGE_SIZE = 8

export type CampaignsPageResult = {
  campaigns: CampaignListItem[]
  totalCount: number
  totalPages: number
  page: number
}

export async function getUserCampaignsPaginated(
  page: number = 1,
  perPage: number = DEFAULT_PAGE_SIZE
): Promise<CampaignsPageResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { campaigns: [], totalCount: 0, totalPages: 0, page: 1 }
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const [{ count: totalCount }, { data: campaigns, error: campaignsError }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('campaigns')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to),
  ])

  const total = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.max(1, Math.min(page, totalPages))

  if (campaignsError || !campaigns?.length) {
    return { campaigns: [], totalCount: total, totalPages, page: safePage }
  }

  const campaignIds = campaigns.map((c) => c.id)
  const { data: ads } = await supabase
    .from('ads')
    .select('id, campaign_id, storage_path')
    .in('campaign_id', campaignIds)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })

  const firstAdByCampaign = new Map<string, { storage_path: string }>()
  for (const ad of ads ?? []) {
    if (!firstAdByCampaign.has(ad.campaign_id)) {
      firstAdByCampaign.set(ad.campaign_id, { storage_path: ad.storage_path! })
    }
  }

  const signedUrlPromises = campaigns.map(async (campaign) => {
    const ad = firstAdByCampaign.get(campaign.id)
    let imageUrl: string | null = null
    if (ad) {
      const { data: signed } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .createSignedUrl(ad.storage_path, SIGNED_URL_EXPIRY)
      imageUrl = signed?.signedUrl ?? null
    }
    return {
      id: campaign.id,
      created_at: campaign.created_at,
      imageUrl,
    }
  })
  const campaignsWithUrls = await Promise.all(signedUrlPromises)

  return {
    campaigns: campaignsWithUrls,
    totalCount: total,
    totalPages,
    page: safePage,
  }
}

export type CampaignDetail = {
  id: string
  created_at: string
  status: string
  productPhotoUrls: string[]
  generatedAdUrls: string[]
  /** Generated ads with id and optional type for badge */
  generatedAds: { id: string; url: string; adType: string | null }[]
  /** Ad ids the current user has favorited (subset of generated ad ids) */
  favoriteAdIds: string[]
}

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, created_at, status')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (campaignError || !campaign) return null

  const { data: photos } = await supabase
    .from('campaign_photos')
    .select('storage_path')
    .eq('campaign_id', campaignId)
    .order('order_index', { ascending: true })

  const { data: ads, error: adsError } = await supabase
    .from('ads')
    .select('id, storage_path, ad_type')
    .eq('campaign_id', campaignId)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })

  // If ad_type column doesn't exist yet (migration not run), fetch without it
  let adsList: { id: string; storage_path: string; ad_type?: string | null }[] = ads ?? []
  if (adsError && adsList.length === 0) {
    const { data: adsFallback } = await supabase
      .from('ads')
      .select('id, storage_path')
      .eq('campaign_id', campaignId)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: true })
    adsList = (adsFallback ?? []).map((a) => ({ ...a, ad_type: null }))
  }

  const adIds = adsList.map((a) => a.id)
  const { data: favorites } =
    adIds.length > 0
      ? await supabase
          .from('ad_favorites')
          .select('ad_id')
          .eq('user_id', user.id)
          .in('ad_id', adIds)
      : { data: null }

  const [productPhotoUrls, generatedAdUrls] = await Promise.all([
    Promise.all(
      (photos ?? []).map(async (p) => {
        const { data } = await supabase.storage
          .from(PRODUCT_PHOTOS_BUCKET)
          .createSignedUrl(p.storage_path, SIGNED_URL_EXPIRY)
        return data?.signedUrl ?? ''
      })
    ),
    Promise.all(
      adsList.map(async (a) => {
        const { data } = await supabase.storage
          .from(GENERATED_ADS_BUCKET)
          .createSignedUrl(a.storage_path, SIGNED_URL_EXPIRY)
        return data?.signedUrl ?? ''
      })
    ),
  ])

  const favoriteAdIds = (favorites ?? []).map((f) => f.ad_id)
  const generatedAds = adsList.map((a, i) => ({
    id: a.id,
    url: generatedAdUrls[i] ?? '',
    adType: a.ad_type ?? null,
  })).filter((a) => a.url)

  return {
    id: campaign.id,
    created_at: campaign.created_at,
    status: campaign.status,
    productPhotoUrls: productPhotoUrls.filter(Boolean),
    generatedAdUrls: generatedAdUrls.filter(Boolean),
    generatedAds,
    favoriteAdIds,
  }
}
