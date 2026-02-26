'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  revalidatePath('/campaigns')
  redirect('/campaigns')
}
