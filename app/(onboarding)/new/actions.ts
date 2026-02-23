'use server'

import { createClient } from '@/lib/supabase/server'
import { generateStudioProductImage } from '@/lib/gemini'
import { redirect } from 'next/navigation'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'

export type CreateCampaignResult = { error: string } | { campaignId: string }

/**
 * Creates a campaign, uploads the first product photo, generates one studio image via Gemini,
 * stores it, and redirects to /campaigns.
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
      return { error: uploadPhotoError.message }
    }

    // 3. Insert campaign_photos row
    await supabase.from('campaign_photos').insert({
      campaign_id: campaignId,
      storage_path: photoPath,
      order_index: 0,
    })

    // 4. Generate studio image via Gemini
    const studioBuffer = await generateStudioProductImage(photoBuffer, mimeType)
    if (!studioBuffer) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return { error: 'Image generation failed. Please try again.' }
    }

    // 5. Upload generated image to Storage and create ad record
    const adId = crypto.randomUUID()
    const adPath = `${prefix}/${adId}.png`
    const { error: uploadAdError } = await supabase.storage
      .from(GENERATED_ADS_BUCKET)
      .upload(adPath, studioBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadAdError) {
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
      return { error: uploadAdError.message }
    }

    await supabase.from('ads').insert({
      campaign_id: campaignId,
      storage_path: adPath,
      format: null,
      status: 'completed',
    })

    // 6. Mark campaign completed
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
  } catch (e) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return { error: e instanceof Error ? e.message : 'Something went wrong' }
  }

  redirect('/campaigns')
}
