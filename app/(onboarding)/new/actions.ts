'use server'

import { createClient } from '@/lib/supabase/server'
import { generateStudioProductImage, suggestBackgroundColor, studioPromptWithBackground, suggestLifestyleInterior, lifestylePromptWithInterior, suggestLifestyleInActionPrompt } from '@/lib/gemini'
import { redirect } from 'next/navigation'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'

export type CreateCampaignResult = { error: string } | { campaignId: string }

/** Valid format values from the form dropdown. */
const FORMATS = ['1:1', '9:16', '16:9', '4:3'] as const

/**
 * Creates a campaign, uploads the first product photo, generates studio image(s) via Gemini
 * (3 images when count=3; 5 and 9 coming soon), stores them, and redirects to /campaigns.
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

  const validPhotoCounts = ['3', '5', '9'] as const
  const count = validPhotoCounts.includes(photoCount as (typeof validPhotoCounts)[number]) ? photoCount : '3'
  if (count !== '3') {
    return { error: '5 and 9 photos are coming soon. Please choose 3 (Studio) for now.' }
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
  const mimeType = firstPhoto.type || 'image/jpeg'
  const ext = mimeType.split('/')[1] || 'jpg'

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
    const photoBuffer = Buffer.from(await firstPhoto.arrayBuffer())
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
    })

    // When user chose 3 photos: generate second image (lifestyle prompt with customized interior), same format
    if (count === '3') {
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

  redirect('/campaigns')
}
