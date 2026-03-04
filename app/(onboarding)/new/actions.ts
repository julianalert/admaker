'use server'

import { createClient } from '@/lib/supabase/server'
import { createCreativeStrategyBrief, createShotPromptsFromBrief, getCreativeDirectorShootFallback, getUltraRealisticShoot, generateStudioProductImage } from '@/lib/gemini'
import { getDefaultBrandId } from '@/lib/brands'
import { getBrandDnaForBrand } from '@/app/(default)/brand-dna/get-brand-dna'

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

/** Valid format values from the form dropdown. */
const FORMATS = ['1:1', '9:16', '16:9', '4:3'] as const

type GenerationOptions =
  | { mode: 'creative'; format: string; photoCount: 5 | 9 }
  | { mode: 'ultra'; format: string; photoCount: 3 | 5 | 7 | 9 }
  | { mode: 'single'; format: string; customPrompt: string }

const SINGLE_PHOTO_PROMPT_PREFIX = `Using the reference product image, create one ultra-realistic commercial photo. Keep the same professional quality. Apply exactly what the user describes.

User description: `

/**
 * Runs image generation in the background (called after create returns campaignId).
 * Loads product photo from storage and runs the appropriate flow.
 */
export async function runPhotoshootGeneration(campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('id, user_id, brand_id, status, generation_options')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (campError || !campaign || campaign.status !== 'generating') {
    return { error: campError?.message ?? 'Campaign not found or already processed' }
  }

  const options = campaign.generation_options as GenerationOptions | null
  if (!options) return { error: 'Missing generation options' }

  const prefix = `${user.id}/${campaignId}`
  const { data: photos } = await supabase
    .from('campaign_photos')
    .select('storage_path')
    .eq('campaign_id', campaignId)
    .order('order_index')
    .limit(1)

  const photoPath = photos?.[0]?.storage_path
  if (!photoPath) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { error: 'Product photo not found' }
  }

  const { data: download } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).download(photoPath)
  if (!download) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { error: 'Could not download product photo' }
  }

  const photoBuffer = Buffer.from(await download.arrayBuffer())
  const validated = validateImageBuffer(photoBuffer)
  if ('error' in validated) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { error: validated.error }
  }
  const { mimeType } = validated

  const format = FORMATS.includes(options.format as (typeof FORMATS)[number]) ? options.format : '9:16'

  try {
    if (options.mode === 'creative') {
      const countNum = options.photoCount
      const requiredCredits = countNum
      const brandDna = campaign.brand_id ? await getBrandDnaForBrand(campaign.brand_id) : null
      const brief = await createCreativeStrategyBrief(photoBuffer, mimeType, {
        photoCount: countNum,
        brandDnaProfile: brandDna?.profile ?? null,
      })
      if (brief) {
        await supabase.from('campaigns').update({ creative_brief: brief }).eq('id', campaignId)
      }
      const shots =
        (brief ? await createShotPromptsFromBrief(photoBuffer, mimeType, brief, { photoCount: countNum }) : null) ??
        (await getCreativeDirectorShootFallback(photoBuffer, mimeType, { photoCount: countNum }))

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        let imageBuffer: Buffer
        try {
          imageBuffer = await generateStudioProductImage(photoBuffer, mimeType, {
            format,
            prompt: shot.prompt,
          })
        } catch (genErr) {
          await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
          await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
          return { error: genErr instanceof Error ? genErr.message : 'Image generation failed.' }
        }

        const adId = crypto.randomUUID()
        const adPath = `${prefix}/${adId}.png`
        const { error: uploadError } = await supabase.storage
          .from(GENERATED_ADS_BUCKET)
          .upload(adPath, imageBuffer, { contentType: 'image/png', upsert: true })

        if (uploadError) {
          await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
          await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
          return { error: uploadError.message }
        }

        await supabase.from('ads').insert({
          campaign_id: campaignId,
          storage_path: adPath,
          format,
          status: 'completed',
          ad_type: shot.ad_type,
        })
      }

      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
    } else if (options.mode === 'ultra') {
      const countNum = options.photoCount
      const requiredCredits = countNum
      const shots = await getUltraRealisticShoot(photoBuffer, mimeType, { photoCount: countNum })

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        let imageBuffer: Buffer
        try {
          imageBuffer = await generateStudioProductImage(photoBuffer, mimeType, {
            format,
            prompt: shot.prompt,
          })
        } catch (genErr) {
          await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
          await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
          return { error: genErr instanceof Error ? genErr.message : 'Image generation failed.' }
        }

        const adId = crypto.randomUUID()
        const adPath = `${prefix}/${adId}.png`
        const { error: uploadError } = await supabase.storage
          .from(GENERATED_ADS_BUCKET)
          .upload(adPath, imageBuffer, { contentType: 'image/png', upsert: true })

        if (uploadError) {
          await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
          await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
          return { error: uploadError.message }
        }

        await supabase.from('ads').insert({
          campaign_id: campaignId,
          storage_path: adPath,
          format,
          status: 'completed',
          ad_type: shot.ad_type,
        })
      }

      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
    } else {
      // single
      const fullPrompt = SINGLE_PHOTO_PROMPT_PREFIX + options.customPrompt
      const imageBuffer = await generateStudioProductImage(photoBuffer, mimeType, {
        format,
        prompt: fullPrompt,
      })

      const adId = crypto.randomUUID()
      const adPath = `${prefix}/${adId}.png`
      const { error: uploadError } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath, imageBuffer, { contentType: 'image/png', upsert: true })

      if (uploadError) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: 1 })
        return { error: uploadError.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath,
        format,
        status: 'completed',
        ad_type: 'custom',
      })

      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
    }
  } catch (e) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    const countNum = options.mode === 'single' ? 1 : (options as { photoCount: number }).photoCount
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: countNum })
    return { error: e instanceof Error ? e.message : 'Something went wrong' }
  }

  return {}
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

  // Credits: 1 per image
  const requiredCredits = countNum
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

  const generationOptions: GenerationOptions = { mode: 'creative', format, photoCount: countNum }

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

  // 2. Upload first product photo to Storage
  const photoPath = `${prefix}/product.${ext}`
  const { error: uploadPhotoError } = await supabase.storage
    .from(PRODUCT_PHOTOS_BUCKET)
    .upload(photoPath, photoBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (uploadPhotoError) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadPhotoError.message }
  }

  // 3. Insert campaign_photos row
  await supabase.from('campaign_photos').insert({
    campaign_id: campaignId,
    storage_path: photoPath,
    order_index: 0,
  })

  // Return immediately; client will call runPhotoshootGeneration(campaignId) without await and redirect after 5s
  return { campaignId }
}

const ULTRA_REALISTIC_COUNTS = ['3', '5', '7', '9'] as const
type UltraRealisticCount = (typeof ULTRA_REALISTIC_COUNTS)[number]

/**
 * Ultra-realistic photoshoot: creates campaign, uploads product photo, returns campaignId.
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
  const photoCount = ULTRA_REALISTIC_COUNTS.includes(photoCountRaw as UltraRealisticCount) ? photoCountRaw : '5'
  const countNum = parseInt(photoCount, 10) as 3 | 5 | 7 | 9
  const formatRaw = (formData.get('format') as string) || '9:16'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '9:16'

  const requiredCredits = countNum
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
  const { mimeType, ext } = validated

  const generationOptions: GenerationOptions = { mode: 'ultra', format, photoCount: countNum }

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

  const photoPath = `${prefix}/product.${ext}`
  const { error: uploadPhotoError } = await supabase.storage
    .from(PRODUCT_PHOTOS_BUCKET)
    .upload(photoPath, photoBuffer, { contentType: mimeType, upsert: true })

  if (uploadPhotoError) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadPhotoError.message }
  }

  await supabase.from('campaign_photos').insert({
    campaign_id: campaignId,
    storage_path: photoPath,
    order_index: 0,
  })

  return { campaignId }
}

/**
 * Create one photo from the user's description + reference image. Creates campaign, uploads photo,
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

  const requiredCredits = 1
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
  const { mimeType, ext } = validated

  const generationOptions: GenerationOptions = { mode: 'single', format, customPrompt: userPrompt }

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

  const photoPath = `${prefix}/product.${ext}`
  const { error: uploadPhotoError } = await supabase.storage
    .from(PRODUCT_PHOTOS_BUCKET)
    .upload(photoPath, photoBuffer, { contentType: mimeType, upsert: true })

  if (uploadPhotoError) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: uploadPhotoError.message }
  }

  await supabase.from('campaign_photos').insert({
    campaign_id: campaignId,
    storage_path: photoPath,
    order_index: 0,
  })

  return { campaignId }
}
