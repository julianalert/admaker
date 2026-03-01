'use server'

import { createClient } from '@/lib/supabase/server'
import { generateStudioProductImage, suggestBackgroundColor, studioPromptWithBackground, suggestLifestyleInterior, lifestylePromptWithInterior, suggestLifestyleInActionPrompt, suggestLifestyleInUsePrompt, suggestNonObviousContextPrompt, suggestUgcStylerPrompt, suggestCinematicProductInUsePrompt } from '@/lib/gemini'
import { redirect } from 'next/navigation'

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

/**
 * Creates a campaign, uploads the first product photo, generates studio image(s) via Gemini
 * (3 images when count=3; 5 when count=5: studio, lifestyle, in-action, lifestyle-in-use, non-obvious-context;
 * 7 when count=7: same as 5 plus UGC Styler and Cinematic product-in-use; 9 coming soon),
 * stores them, and redirects to /photoshoot.
 * Output format (aspect ratio) is taken from the Format dropdown.
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

  const photoCount = (formData.get('photoCount') as string) || '3'
  const formatRaw = (formData.get('format') as string) || '1:1'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '1:1'

  const validPhotoCounts = ['3', '5', '7', '9'] as const
  const count = validPhotoCounts.includes(photoCount as (typeof validPhotoCounts)[number]) ? photoCount : '3'
  if (count === '9') {
    return { error: '9 photos are coming soon. Please choose 3, 5, or 7 for now.' }
  }

  // Credits: 1 per image
  const requiredCredits = parseInt(count, 10)
  const { data: creditsAfter, error: creditsError } = await supabase.rpc('consume_credits', {
    p_user_id: user.id,
    p_amount: requiredCredits,
  })
  if (creditsError || creditsAfter === null) {
    const msg =
      creditsError && String(creditsError.message).includes('insufficient_credits')
        ? `Not enough credits. This campaign requires ${requiredCredits} credit${requiredCredits !== 1 ? 's' : ''}.`
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

  // 1. Create campaign (draft)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      status: 'generating',
    })
    .select('id')
    .single()

  if (campaignError || !campaign) {
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: campaignError?.message ?? 'Failed to create campaign' }
  }

  const campaignId = campaign.id
  const prefix = `${user.id}/${campaignId}`

  try {
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

    // 4. Generate first studio image via Gemini (with format)
    // Customize studio background color via Gemini vision (for 1 or 3 photos)
    const backgroundPhrase = await suggestBackgroundColor(photoBuffer, mimeType)
    const studioPrompt = studioPromptWithBackground(backgroundPhrase)

    let studioBuffer: Buffer
    try {
      studioBuffer = await generateStudioProductImage(photoBuffer, mimeType, {
        format,
        prompt: studioPrompt,
      })
    } catch (genErr) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
      return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
    }

    // 5. Upload first generated image and create ad record
    const adId1 = crypto.randomUUID()
    const adPath1 = `${prefix}/${adId1}.png`
    const { error: uploadAdError } = await supabase.storage
      .from(GENERATED_ADS_BUCKET)
      .upload(adPath1, studioBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadAdError) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
      return { error: uploadAdError.message }
    }

    await supabase.from('ads').insert({
      campaign_id: campaignId,
      storage_path: adPath1,
      format,
      status: 'completed',
      ad_type: 'studio',
    })

    // When user chose 3, 5, or 7 photos: generate second image (lifestyle prompt with customized interior), same format
    if (count === '3' || count === '5' || count === '7') {
      const interiorPhrase = await suggestLifestyleInterior(photoBuffer, mimeType)
      const lifestylePrompt = lifestylePromptWithInterior(interiorPhrase)

      let studioBuffer2: Buffer
      try {
        studioBuffer2 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: lifestylePrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId2 = crypto.randomUUID()
      const adPath2 = `${prefix}/${adId2}.png`
      const { error: uploadAd2Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath2, studioBuffer2, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd2Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd2Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath2,
        format,
        status: 'completed',
        ad_type: 'studio_2',
      })

      // Third image: product in action — LLM generates full prompt, then we generate the image
      const inActionPrompt = await suggestLifestyleInActionPrompt(photoBuffer, mimeType)

      let studioBuffer3: Buffer
      try {
        studioBuffer3 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: inActionPrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId3 = crypto.randomUUID()
      const adPath3 = `${prefix}/${adId3}.png`
      const { error: uploadAd3Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath3, studioBuffer3, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd3Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd3Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath3,
        format,
        status: 'completed',
        ad_type: 'contextual',
      })
    }

    // When user chose 5 or 7 photos: 4th image — lifestyle with product in use by human (vision generates full prompt)
    if (count === '5' || count === '7') {
      const lifestyleInUsePrompt = await suggestLifestyleInUsePrompt(photoBuffer, mimeType)

      let studioBuffer4: Buffer
      try {
        studioBuffer4 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: lifestyleInUsePrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId4 = crypto.randomUUID()
      const adPath4 = `${prefix}/${adId4}.png`
      const { error: uploadAd4Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath4, studioBuffer4, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd4Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd4Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath4,
        format,
        status: 'completed',
        ad_type: 'lifestyle',
      })
    }

    // 5th image — non-obvious meaningful context (vision generates full prompt)
    if (count === '5' || count === '7') {
      const nonObviousPrompt = await suggestNonObviousContextPrompt(photoBuffer, mimeType)

      let studioBuffer5: Buffer
      try {
        studioBuffer5 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: nonObviousPrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId5 = crypto.randomUUID()
      const adPath5 = `${prefix}/${adId5}.png`
      const { error: uploadAd5Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath5, studioBuffer5, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd5Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd5Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath5,
        format,
        status: 'completed',
        ad_type: 'creative',
      })
    }

    // When user chose 7 photos: 6th image — UGC Styler (person using product, iPhone camera, full UGC codes)
    if (count === '7') {
      const ugcStylerPrompt = await suggestUgcStylerPrompt(photoBuffer, mimeType)

      let studioBuffer6: Buffer
      try {
        studioBuffer6 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: ugcStylerPrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId6 = crypto.randomUUID()
      const adPath6 = `${prefix}/${adId6}.png`
      const { error: uploadAd6Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath6, studioBuffer6, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd6Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd6Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath6,
        format,
        status: 'completed',
        ad_type: 'ugc_styler',
      })
    }

    // When user chose 7 photos: 7th image — Cinematic product in use (vision generates full prompt)
    if (count === '7') {
      const cinematicPrompt = await suggestCinematicProductInUsePrompt(photoBuffer, mimeType)

      let studioBuffer7: Buffer
      try {
        studioBuffer7 = await generateStudioProductImage(photoBuffer, mimeType, {
          format,
          prompt: cinematicPrompt,
        })
      } catch (genErr) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: genErr instanceof Error ? genErr.message : 'Image generation failed. Please try again.' }
      }

      const adId7 = crypto.randomUUID()
      const adPath7 = `${prefix}/${adId7}.png`
      const { error: uploadAd7Error } = await supabase.storage
        .from(GENERATED_ADS_BUCKET)
        .upload(adPath7, studioBuffer7, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadAd7Error) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
        await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
        return { error: uploadAd7Error.message }
      }

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        storage_path: adPath7,
        format,
        status: 'completed',
        ad_type: 'cinematic',
      })
    }

    // 6. Mark campaign completed
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
  } catch (e) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    // Refund credits on failure so user is not charged when generation or upload fails
    await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: requiredCredits })
    return { error: e instanceof Error ? e.message : 'Something went wrong' }
  }

  redirect(`/photoshoot/${campaignId}`)
}
