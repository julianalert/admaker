/**
 * Resumable photoshoot generation: one image per invocation.
 * Used by the Server Action (client polling) and the cron route so campaigns
 * complete even when the initial request times out.
 *
 * Call doOneGenerationStep(supabase, campaignId) repeatedly until
 * { completed: true } or { error }.
 * supabase can be user-scoped (Server Action) or service-role (cron).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createCreativeStrategyBrief,
  createShotPromptsFromBrief,
  getCreativeDirectorShootFallback,
  getUltraRealisticShoot,
  generateStudioProductImage,
} from '@/lib/gemini'
import type { BrandDnaProfile } from '@/lib/brand-dna/types'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'
const FORMATS = ['1:1', '9:16', '16:9', '4:3', '4:5', '5:4'] as const
const SINGLE_PHOTO_PROMPT_PREFIX = `Using the reference product image, create one ultra-realistic commercial photo. Keep the same professional quality. Apply exactly what the user describes.

User description: `

type GenerationOptions =
  | { mode: 'creative'; format: string; photoCount: 5 | 9; quality: '2K' | '4K'; clientGuidelines?: string }
  | { mode: 'ultra'; format: string; photoCount: 3 | 5 | 7 | 9; quality: '2K' | '4K' }
  | { mode: 'single'; format: string; customPrompt: string; quality: '2K' | '4K' }

type Shot = { ad_type: string; prompt: string }

function validateImageBuffer(buffer: Buffer): { ok: true; mimeType: string } | { error: string } {
  if (buffer.length < 12) return { error: 'File too small' }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ok: true, mimeType: 'image/jpeg' }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { ok: true, mimeType: 'image/png' }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return { ok: true, mimeType: 'image/webp' }
  return { error: 'Invalid image' }
}

export type StepResult = { completed: boolean; error?: string }

export type StepOptions = {
  /** When true, use refund_credits_service (for cron with service-role client). */
  serviceRefund?: boolean
}

/**
 * Generates at most one image for the campaign and returns.
 * Idempotent: safe to call repeatedly until completed or error.
 * Use campaign.user_id for refunds (from campaign row when using service-role).
 */
export async function doOneGenerationStep(
  supabase: SupabaseClient,
  campaignId: string,
  stepOptions?: StepOptions
): Promise<StepResult> {
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('id, user_id, brand_id, status, generation_options, creative_shot_prompts, creative_brief')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign || campaign.status !== 'generating') {
    return { completed: false }
  }

  const userId = campaign.user_id as string
  const options = campaign.generation_options as GenerationOptions | null
  if (!options) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { completed: true, error: 'Missing generation options' }
  }

  const prefix = `${userId}/${campaignId}`
  const { data: photoRows } = await supabase
    .from('campaign_photos')
    .select('storage_path')
    .eq('campaign_id', campaignId)
    .order('order_index')

  if (!photoRows?.length) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { completed: true, error: 'Product photo not found' }
  }

  type ProductImage = { buffer: Buffer; mimeType: string }
  const productImages: ProductImage[] = []
  for (const row of photoRows) {
    const path = row.storage_path
    if (!path) continue
    const { data: download } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).download(path)
    if (!download) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return { completed: true, error: 'Could not download product photo' }
    }
    const buffer = Buffer.from(await download.arrayBuffer())
    const validated = validateImageBuffer(buffer)
    if ('error' in validated) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return { completed: true, error: validated.error }
    }
    productImages.push({ buffer, mimeType: validated.mimeType })
  }

  if (productImages.length === 0) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { completed: true, error: 'No valid product photos' }
  }

  const firstImage = productImages[0]
  const format = FORMATS.includes(options.format as (typeof FORMATS)[number]) ? options.format : '9:16'
  const quality = options.quality === '4K' ? '4K' : '2K'
  const creditsPerImage = quality === '4K' ? 2 : 1

  const refundFull = () => {
    const countNum = options.mode === 'single' ? 1 : (options as { photoCount: number }).photoCount
    const amount = countNum * creditsPerImage
    return stepOptions?.serviceRefund
      ? supabase.rpc('refund_credits_service', { p_user_id: userId, p_amount: amount })
      : supabase.rpc('refund_credits', { p_user_id: userId, p_amount: amount })
  }

  try {
    if (options.mode === 'single') {
      const { data: existingAds } = await supabase.from('ads').select('id').eq('campaign_id', campaignId)
      if (existingAds && existingAds.length > 0) {
        await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
        return { completed: true }
      }
      const adId = crypto.randomUUID()
      const { error: insertErr } = await supabase.from('ads').insert({
        id: adId,
        campaign_id: campaignId,
        generation_index: 0,
        storage_path: null,
        format,
        status: 'generating',
        ad_type: 'custom',
        generation_prompt: null,
      })
      if (insertErr) {
        if (insertErr.code === '23505') return { completed: false }
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        return { completed: true, error: insertErr.message }
      }
      const fullPrompt = SINGLE_PHOTO_PROMPT_PREFIX + options.customPrompt
      let imageBuffer: Buffer
      try {
        imageBuffer = await generateStudioProductImage(productImages, { format, prompt: fullPrompt, quality })
      } catch (genErr) {
        await supabase.from('ads').delete().eq('id', adId)
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await refundFull()
        return { completed: true, error: genErr instanceof Error ? genErr.message : 'Image generation failed' }
      }
      const adPath = `${prefix}/${adId}.png`
      const { error: uploadError } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath, imageBuffer, { contentType: 'image/png', upsert: true })
      if (uploadError) {
        await supabase.from('ads').delete().eq('id', adId)
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await refundFull()
        return { completed: true, error: uploadError.message }
      }
      await supabase.from('ads').update({ storage_path: adPath, status: 'completed', generation_prompt: fullPrompt }).eq('id', adId)
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
      return { completed: true }
    }

    // creative or ultra: need shot list and current ad count
    let shots: Shot[] = (campaign.creative_shot_prompts as Shot[] | null) ?? []
    const countNum = options.mode === 'creative' ? options.photoCount : options.photoCount

    if (shots.length === 0) {
      if (options.mode === 'creative') {
        const { data: brandDnaRow } = await supabase
          .from('brand_dna')
          .select('profile')
          .eq('brand_id', campaign.brand_id)
          .maybeSingle()
        const brandDnaProfile = (brandDnaRow?.profile as BrandDnaProfile | null) ?? null
        const creativeCount = options.photoCount
        const brief = await createCreativeStrategyBrief(productImages, {
          photoCount: creativeCount,
          brandDnaProfile,
          clientGuidelines: options.clientGuidelines,
        })
        if (brief) {
          await supabase.from('campaigns').update({ creative_brief: brief }).eq('id', campaignId)
        }
        shots =
          (brief ? await createShotPromptsFromBrief(productImages, brief, { photoCount: creativeCount, clientGuidelines: options.clientGuidelines }) : null) ??
          (await getCreativeDirectorShootFallback(firstImage.buffer, firstImage.mimeType, { photoCount: creativeCount }))
      } else {
        shots = await getUltraRealisticShoot(firstImage.buffer, firstImage.mimeType, { photoCount: countNum })
      }
      await supabase.from('campaigns').update({ creative_shot_prompts: shots }).eq('id', campaignId)
    }

    const { data: ads } = await supabase.from('ads').select('id').eq('campaign_id', campaignId).order('created_at', { ascending: true })
    const currentCount = ads?.length ?? 0
    if (currentCount >= shots.length) {
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
      return { completed: true }
    }

    const shot = shots[currentCount]
    const adId = crypto.randomUUID()
    const { error: reserveErr } = await supabase.from('ads').insert({
      id: adId,
      campaign_id: campaignId,
      generation_index: currentCount,
      storage_path: null,
      format,
      status: 'generating',
      ad_type: shot.ad_type,
      generation_prompt: shot.prompt,
    })
    if (reserveErr) {
      if (reserveErr.code === '23505') return { completed: false }
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return { completed: true, error: reserveErr.message }
    }

    let imageBuffer: Buffer
    try {
      imageBuffer = await generateStudioProductImage(productImages, { format, prompt: shot.prompt, quality })
    } catch (genErr) {
      await supabase.from('ads').delete().eq('id', adId)
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      await refundFull()
      return { completed: true, error: genErr instanceof Error ? genErr.message : 'Image generation failed' }
    }

    const adPath = `${prefix}/${adId}.png`
    const { error: uploadError } = await supabase.storage
      .from(GENERATED_ADS_BUCKET)
      .upload(adPath, imageBuffer, { contentType: 'image/png', upsert: true })
    if (uploadError) {
      await supabase.from('ads').delete().eq('id', adId)
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      await refundFull()
      return { completed: true, error: uploadError.message }
    }

    await supabase.from('ads').update({ storage_path: adPath, status: 'completed' }).eq('id', adId)

    const nextCount = currentCount + 1
    if (nextCount >= shots.length) {
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
      return { completed: true }
    }
    return { completed: false }
  } catch (e) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    const countNum = options.mode === 'single' ? 1 : (options as { photoCount: number }).photoCount
    const amount = countNum * creditsPerImage
    if (stepOptions?.serviceRefund) {
      await supabase.rpc('refund_credits_service', { p_user_id: userId, p_amount: amount })
    } else {
      await supabase.rpc('refund_credits', { p_user_id: userId, p_amount: amount })
    }
    return { completed: true, error: e instanceof Error ? e.message : 'Something went wrong' }
  }
}
