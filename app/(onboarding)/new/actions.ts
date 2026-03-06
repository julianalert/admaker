'use server'

import { createClient } from '@/lib/supabase/server'
import { getDefaultBrandId } from '@/lib/brands'
import { doOneGenerationStep } from '@/lib/photoshoot-generation-step'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'
const MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024 // 4MB per file

/** Allowed image types by magic bytes. Returns detected mime and ext or error. */
function validateImageBuffer(buffer: Buffer): { ok: true; mimeType: string; ext: string } | { error: string } {
  if (buffer.length < 12) {
    return { error: 'File is too small to be a valid image' }
  }
  if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
    return { error: `Image must be under ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024}MB` }
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, mimeType: 'image/jpeg', ext: 'jpg' }
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ok: true, mimeType: 'image/png', ext: 'png' }
  }
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ok: true, mimeType: 'image/webp', ext: 'webp' }
  }
  return { error: 'Invalid image. Use JPEG, PNG, or WebP.' }
}

export type CreateCampaignResult = { error: string } | { campaignId: string }

/** Upload and validate all product photo files. Returns paths and mimeType or error. */
async function uploadAllProductPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prefix: string,
  photos: File[]
): Promise<{ error: string } | { paths: string[]; mimeType: string }> {
  const paths: string[] = []
  let mimeType = 'image/jpeg'
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i]
    if (!(file instanceof File)) return { error: 'Invalid file' }
    const buffer = Buffer.from(await file.arrayBuffer())
    const validated = validateImageBuffer(buffer)
    if ('error' in validated) return { error: validated.error }
    const ext = validated.ext
    mimeType = validated.mimeType
    const photoPath = `${prefix}/product_${i}.${ext}`
    const { error } = await supabase.storage
      .from(PRODUCT_PHOTOS_BUCKET)
      .upload(photoPath, buffer, { contentType: validated.mimeType, upsert: true })
    if (error) return { error: error.message }
    paths.push(photoPath)
  }
  return { paths, mimeType }
}

/** Valid format values from the form dropdown. */
const FORMATS = ['1:1', '9:16', '16:9', '4:3', '4:5', '5:4'] as const

type GenerationOptions =
  | { mode: 'creative'; format: string; photoCount: 5 | 9; quality: '2K' | '4K'; clientGuidelines?: string }
  | { mode: 'ultra'; format: string; photoCount: 5 | 9; quality: '2K' | '4K'; clientGuidelines?: string }
  | { mode: 'single'; format: string; customPrompt: string; quality: '2K' | '4K' }

const SINGLE_PHOTO_PROMPT_PREFIX = `Using the reference product image, create one ultra-realistic commercial photo. Keep the same professional quality. Apply exactly what the user describes.

User description: `

/** If a campaign has been "generating" longer than this, we consider it stuck (e.g. process was killed by platform timeout). */
const STALE_GENERATING_MS = 20 * 60 * 1000 // 20 minutes

/**
 * Marks a campaign as failed and refunds credits if it has been stuck in "generating" for too long.
 * Call from the photoshoot detail page when loading a campaign that is still generating.
 * Returns { updated: true } if the campaign was marked failed, { updated: false } otherwise.
 */
export async function markStuckCampaignAsFailedIfNeeded(campaignId: string): Promise<{ updated: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { updated: false, error: 'Not signed in' }

  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, status, created_at, generation_options')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !campaign || campaign.status !== 'generating') return { updated: false }
  const createdAt = new Date(campaign.created_at).getTime()
  if (Date.now() - createdAt < STALE_GENERATING_MS) return { updated: false }

  const opts = campaign.generation_options as GenerationOptions | null
  const creditsPerImage = opts?.quality === '4K' ? 2 : 1
  const countNum = !opts ? 1 : opts.mode === 'single' ? 1 : (opts as { photoCount: number }).photoCount
  const refundAmount = countNum * creditsPerImage

  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ status: 'failed' })
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .eq('status', 'generating')

  if (updateError) return { updated: false, error: updateError.message }

  await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: refundAmount })
  return { updated: true }
}

/**
 * Runs one step of photoshoot generation (at most one image). Call repeatedly until completed.
 * Used by the client for polling and by the cron to finish campaigns.
 */
export async function runPhotoshootGenerationStep(campaignId: string): Promise<{ completed: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { completed: false, error: 'Not signed in' }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()
  if (!campaign) return { completed: false, error: 'Campaign not found' }

  return doOneGenerationStep(supabase, campaignId)
}

/**
 * Runs image generation: one step per call (resumable). Loops until completed or error.
 * When the request times out, progress is saved; cron or next poll will continue.
 */
export async function runPhotoshootGeneration(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()
  if (!campaign) return { error: 'Campaign not found' }

  for (;;) {
    const result = await doOneGenerationStep(supabase, campaignId)
    if (result.completed) {
      return result.error ? { error: result.error } : {}
    }
  }
}

/**
 * Creates a campaign, uploads the first product photo, stores generation options,
 * returns campaignId immediately so the client can redirect. Image generation runs
 * in background via runPhotoshootGeneration (called by client without await).
 */
export async function createCampaignWithStudioPhoto(formData: FormData): Promise<CreateCampaignResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const photos = formData.getAll('photos') as File[]
  if (!photos?.length || !(photos[0] instanceof File)) {
    return { error: 'Please upload at least one product photo' }
  }

  const photoCount = (formData.get('photoCount') as string) || '5'
  const formatRaw = (formData.get('format') as string) || '9:16'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '9:16'

  const validPhotoCounts = ['5', '9'] as const
  const count = validPhotoCounts.includes(photoCount as (typeof validPhotoCounts)[number]) ? photoCount : '5'
  const countNum = parseInt(count, 10) as 5 | 9

  const clientGuidelinesRaw = (formData.get('clientGuidelines') as string)?.trim() ?? ''
  const clientGuidelines = clientGuidelinesRaw.length > 0 ? clientGuidelinesRaw : undefined

  const qualityRaw = (formData.get('quality') as string) || '2K'
  const quality = qualityRaw === '4K' ? '4K' : '2K'
  const creditsPerImage = quality === '4K' ? 2 : 1
  const requiredCredits = countNum * creditsPerImage

  // Credits: 2K = 1 per image, 4K = 2 per image
  const { data: creditsAfter, error: creditsError } = await supabase.rpc('consume_credits', {
    p_user_id: user.id,
    p_amount: requiredCredits,
  })
  if (creditsError || creditsAfter === null) {
    const msg =
      creditsError && String(creditsError.message).includes('insufficient_credits')
        ? `Not enough credits. This campaign requires ${requiredCredits} credits.`
        : creditsError?.message ?? 'Could not deduct credits.'
    return { error: msg }
  }

  const firstPhoto = photos[0]
  const photoBuffer = Buffer.from(await firstPhoto.arrayBuffer())
  const validated = validateImageBuffer(photoBuffer)
  if ('error' in validated) {
    return { error: validated.error }
  }
  const { mimeType, ext } = validated

  const generationOptions: GenerationOptions = { mode: 'creative', format, photoCount: countNum, quality, clientGuidelines }

  const brandId = await getDefaultBrandId()
  if (!brandId) {
    return { error: 'No brand found. Complete the onboarding to create a brand first.' }
  }

  // 1. Create campaign with generation_options (so background can run)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      brand_id: brandId,
      status: 'generating',
      generation_options: generationOptions,
    })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: campaignError?.message ?? 'Failed to create campaign' }
  }

  const campaignId = campaign.id
  const prefix = `${user.id}/${campaignId}`

  // 2. Upload all product photos to Storage
  const uploadResult = await uploadAllProductPhotos(supabase, prefix, photos)
  if ('error' in uploadResult) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadResult.error }
  }

  // 3. Insert campaign_photos rows (one per uploaded photo)
  for (let i = 0; i < uploadResult.paths.length; i++) {
    await supabase.from('campaign_photos').insert({
      campaign_id: campaignId,
      storage_path: uploadResult.paths[i],
      order_index: i,
    })
  }

  // Return immediately; client will call runPhotoshootGeneration(campaignId) without await and redirect after 5s
  return { campaignId }
}

const PRODUCT_PHOTO_COUNTS = ['5', '9'] as const
type ProductPhotoCount = (typeof PRODUCT_PHOTO_COUNTS)[number]

/**
 * Product Photoshoot: same workflow as Creative Director (brief + shot prompts + client guidelines)
 * but without Brand DNA. Creates campaign, uploads product photo, returns campaignId.
 * Generation runs in background via runPhotoshootGeneration.
 */
export async function createCampaignUltraRealistic(formData: FormData): Promise<CreateCampaignResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const photos = formData.getAll('photos') as File[]
  if (!photos?.length || !(photos[0] instanceof File)) {
    return { error: 'Please upload at least one product photo' }
  }

  const photoCountRaw = (formData.get('photoCount') as string) || '5'
  const photoCount = PRODUCT_PHOTO_COUNTS.includes(photoCountRaw as ProductPhotoCount) ? photoCountRaw : '5'
  const countNum = parseInt(photoCount, 10) as 5 | 9
  const formatRaw = (formData.get('format') as string) || '9:16'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '9:16'
  const qualityRaw = (formData.get('quality') as string) || '2K'
  const quality = qualityRaw === '4K' ? '4K' : '2K'
  const clientGuidelinesRaw = (formData.get('clientGuidelines') as string)?.trim() ?? ''
  const clientGuidelines = clientGuidelinesRaw.length > 0 ? clientGuidelinesRaw : undefined
  const requiredCredits = countNum * (quality === '4K' ? 2 : 1)
  const { data: creditsAfter, error: creditsError } = await supabase.rpc('consume_credits', {
    p_user_id: user.id,
    p_amount: requiredCredits,
  })
  if (creditsError || creditsAfter === null) {
    const msg =
      creditsError && String(creditsError.message).includes('insufficient_credits')
        ? `Not enough credits. This campaign requires ${requiredCredits} credits.`
        : creditsError?.message ?? 'Could not deduct credits.'
    return { error: msg }
  }

  const brandId = await getDefaultBrandId()
  if (!brandId) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: 'No brand found. Complete the onboarding to create a brand first.' }
  }

  const firstPhoto = photos[0]
  const photoBuffer = Buffer.from(await firstPhoto.arrayBuffer())
  const validated = validateImageBuffer(photoBuffer)
  if ('error' in validated) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: validated.error }
  }

  const generationOptions: GenerationOptions = { mode: 'ultra', format, photoCount: countNum, quality, clientGuidelines }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({ user_id: user.id, brand_id: brandId, status: 'generating', generation_options: generationOptions })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: campaignError?.message ?? 'Failed to create campaign' }
  }

  const campaignId = campaign.id
  const prefix = `${user.id}/${campaignId}`

  const uploadResult = await uploadAllProductPhotos(supabase, prefix, photos)
  if ('error' in uploadResult) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadResult.error }
  }

  for (let i = 0; i < uploadResult.paths.length; i++) {
    await supabase.from('campaign_photos').insert({
      campaign_id: campaignId,
      storage_path: uploadResult.paths[i],
      order_index: i,
    })
  }

  return { campaignId }
}

/**
 * Create one photo from the user's description + reference image(s). Creates campaign, uploads photo(s),
 * returns campaignId. Generation runs in background via runPhotoshootGeneration.
 */
export async function createCampaignSinglePhoto(formData: FormData): Promise<CreateCampaignResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const photos = formData.getAll('photos') as File[]
  if (!photos?.length || !(photos[0] instanceof File)) {
    return { error: 'Please upload at least one product photo' }
  }

  const userPrompt = (formData.get('customPrompt') as string)?.trim() ?? ''
  if (!userPrompt) {
    return { error: 'Please describe the shot you want' }
  }

  const formatRaw = (formData.get('format') as string) || '9:16'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '9:16'
  const qualityRaw = (formData.get('quality') as string) || '2K'
  const quality = qualityRaw === '4K' ? '4K' : '2K'
  const requiredCredits = quality === '4K' ? 2 : 1
  const { data: creditsAfter, error: creditsError } = await supabase.rpc('consume_credits', {
    p_user_id: user.id,
    p_amount: requiredCredits,
  })
  if (creditsError || creditsAfter === null) {
    const msg =
      creditsError && String(creditsError.message).includes('insufficient_credits')
        ? 'Not enough credits. This photo costs 1 credit.'
        : creditsError?.message ?? 'Could not deduct credits.'
    return { error: msg }
  }

  const firstPhoto = photos[0]
  const photoBuffer = Buffer.from(await firstPhoto.arrayBuffer())
  const validated = validateImageBuffer(photoBuffer)
  if ('error' in validated) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: validated.error }
  }

  const generationOptions: GenerationOptions = { mode: 'single', format, customPrompt: userPrompt, quality }

  const brandId = await getDefaultBrandId()
  if (!brandId) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: 'No brand found. Complete the onboarding to create a brand first.' }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({ user_id: user.id, brand_id: brandId, status: 'generating', generation_options: generationOptions })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: campaignError?.message ?? 'Failed to create campaign' }
  }

  const campaignId = campaign.id
  const prefix = `${user.id}/${campaignId}`

  const uploadResult = await uploadAllProductPhotos(supabase, prefix, photos)
  if ('error' in uploadResult) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadResult.error }
  }

  for (let i = 0; i < uploadResult.paths.length; i++) {
    await supabase.from('campaign_photos').insert({
      campaign_id: campaignId,
      storage_path: uploadResult.paths[i],
      order_index: i,
    })
  }

  return { campaignId }
}
