'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateStudioProductImage } from '@/lib/gemini'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'

export type DeleteCampaignResult = { error: string } | void

/**
 * Deletes a campaign: removes all linked storage files (product photos + generated ads)
 * then deletes the campaign (cascade removes campaign_photos and ads rows).
 */
export async function deleteCampaign(campaignId: string): Promise<DeleteCampaignResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (campaignError || !campaign) {
    return { error: 'Campaign not found or access denied' }
  }

  const { data: photos } = await supabase
    .from('campaign_photos')
    .select('storage_path')
    .eq('campaign_id', campaignId)

  const { data: ads } = await supabase
    .from('ads')
    .select('storage_path')
    .eq('campaign_id', campaignId)
    .not('storage_path', 'is', null)

  const productPaths = (photos ?? []).map((p) => p.storage_path).filter(Boolean)
  const adPaths = (ads ?? []).map((a) => a.storage_path!).filter(Boolean)

  if (productPaths.length > 0) {
    await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove(productPaths)
  }
  if (adPaths.length > 0) {
    await supabase.storage.from(GENERATED_ADS_BUCKET).remove(adPaths)
  }

  const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', campaignId).eq('user_id', user.id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/photoshoot')
  redirect('/photoshoot')
}

export type DeleteAdResult = { error: string } | void

/**
 * Deletes a single generated ad (storage file + ads row). User must own the campaign.
 */
export async function deleteAd(adId: string): Promise<DeleteAdResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const { data: ad, error: adError } = await supabase
    .from('ads')
    .select('id, campaign_id, storage_path')
    .eq('id', adId)
    .single()

  if (adError || !ad) {
    return { error: 'Ad not found' }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', ad.campaign_id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return { error: 'Access denied' }
  }

  if (ad.storage_path) {
    await supabase.storage.from(GENERATED_ADS_BUCKET).remove([ad.storage_path])
  }
  const { error: deleteError } = await supabase.from('ads').delete().eq('id', adId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/photoshoot/${ad.campaign_id}`)
}

export type ToggleFavoriteAdResult = { error: string } | void

/**
 * Toggles favorite state for an ad. User must own the campaign.
 */
export async function toggleFavoriteAd(adId: string): Promise<{ favorited: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { favorited: false, error: 'Not signed in' }
  }

  const { data: ad, error: adError } = await supabase
    .from('ads')
    .select('id, campaign_id')
    .eq('id', adId)
    .single()

  if (adError || !ad) {
    return { favorited: false, error: 'Ad not found' }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', ad.campaign_id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return { favorited: false, error: 'Access denied' }
  }

  const { data: existing } = await supabase
    .from('ad_favorites')
    .select('ad_id')
    .eq('user_id', user.id)
    .eq('ad_id', adId)
    .maybeSingle()

  if (existing) {
    const { error: delErr } = await supabase
      .from('ad_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('ad_id', adId)
    if (delErr) return { favorited: true, error: delErr.message }
    revalidatePath(`/photoshoot/${ad.campaign_id}`)
    return { favorited: false }
  } else {
    const { error: insertErr } = await supabase
      .from('ad_favorites')
      .insert({ user_id: user.id, ad_id: adId })
    if (insertErr) return { favorited: false, error: insertErr.message }
    revalidatePath(`/photoshoot/${ad.campaign_id}`)
    return { favorited: true }
  }
}

export type FavoriteAllAdsResult = { error: string } | void

/**
 * Favorites all generated ads of a campaign for the current user.
 * Skips ads already favorited (no-op for those).
 */
export async function favoriteAllAds(campaignId: string): Promise<FavoriteAllAdsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return { error: 'Campaign not found or access denied' }
  }

  const { data: ads } = await supabase
    .from('ads')
    .select('id')
    .eq('campaign_id', campaignId)

  if (!ads?.length) {
    return
  }

  const rows = ads.map((a) => ({ user_id: user.id, ad_id: a.id }))
  const { error } = await supabase.from('ad_favorites').upsert(rows, {
    onConflict: 'user_id,ad_id',
    ignoreDuplicates: true,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/photoshoot/${campaignId}`)
}

export type EditPhotoWithPromptResult = { error: string } | void

const EDIT_PROMPT_PREFIX = `Using the reference image, create a new ultra-realistic image that applies this edit. Keep the same professional quality and style. Apply only the requested change.

User edit request: `

/**
 * Uses the selected ad image as reference + user prompt to generate a new image via Gemini,
 * uploads it to generated-ads, and adds a new ad to the campaign. Consumes 1 credit.
 */
export async function editPhotoWithPrompt(
  campaignId: string,
  adId: string,
  userPrompt: string
): Promise<EditPhotoWithPromptResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const trimmedPrompt = userPrompt?.trim()
  if (!trimmedPrompt) {
    return { error: 'Please enter what you want to edit' }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return { error: 'Campaign not found or access denied' }
  }

  const { data: ad, error: adError } = await supabase
    .from('ads')
    .select('id, campaign_id, storage_path')
    .eq('id', adId)
    .eq('campaign_id', campaignId)
    .single()

  if (adError || !ad?.storage_path) {
    return { error: 'Ad not found' }
  }

  const { data: creditsAfter, error: creditsError } = await supabase.rpc('consume_credits', {
    p_user_id: user.id,
    p_amount: 1,
  })
  if (creditsError || creditsAfter === null) {
    const msg =
      creditsError && String(creditsError.message).includes('insufficient_credits')
        ? 'Not enough credits. This edit costs 1 credit.'
        : creditsError?.message ?? 'Could not deduct credits.'
    return { error: msg }
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(GENERATED_ADS_BUCKET)
    .download(ad.storage_path)

  if (downloadError || !blob) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: 1 })
    return { error: downloadError?.message ?? 'Failed to download reference image' }
  }

  const refBuffer = Buffer.from(await blob.arrayBuffer())
  const prompt = EDIT_PROMPT_PREFIX + trimmedPrompt

  let resultBuffer: Buffer
  try {
    // Uses same Nano Banana 2 pipeline as studio generation (generateStudioProductImage)
    resultBuffer = await generateStudioProductImage(refBuffer, 'image/png', {
      format: '1:1',
      prompt,
    })
  } catch (genErr) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: 1 })
    return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
  }

  const newAdId = crypto.randomUUID()
  const prefix = `${user.id}/${campaignId}`
  const newAdPath = `${prefix}/${newAdId}.png`

  const { error: uploadError } = await supabase.storage
    .from(GENERATED_ADS_BUCKET)
    .upload(newAdPath, resultBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: 1 })
    return { error: uploadError.message }
  }

  const { error: insertError } = await supabase.from('ads').insert({
    campaign_id: campaignId,
    storage_path: newAdPath,
    format: '1:1',
    status: 'completed',
  })

  if (insertError) {
    await supabase.storage.from(GENERATED_ADS_BUCKET).remove([newAdPath])
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: 1 })
    return { error: insertError.message }
  }

  revalidatePath(`/photoshoot/${campaignId}`)
}
