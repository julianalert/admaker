import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCampaignDetail } from '../get-campaigns'
import { markStuckCampaignAsFailedIfNeeded } from '@/app/(onboarding)/new/actions'
import CampaignActions from './campaign-actions'
import GeneratedAdsGrid from './generated-ads-grid'
import FeedbackCard from './feedback-card'

export const metadata = {
  title: 'Photoshoot',
  description: 'Photoshoot detail and generated ads.',
}

export default async function PhotoshootDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let [campaign, user] = await Promise.all([
    getCampaignDetail(id),
    (async () => {
      const supabase = await createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      return u
    })(),
  ])
  if (!campaign) notFound()

  // If still "generating", check if stuck (e.g. serverless timeout killed the job) and mark failed + refund
  if (campaign.status === 'generating') {
    const { updated } = await markStuckCampaignAsFailedIfNeeded(id)
    if (updated) {
      const next = await getCampaignDetail(id)
      if (next) campaign = next
    }
  }

  const userAvatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page content - same layout as post/page.tsx, wider max so ad templates can expand */}
      <div className="max-w-[96rem] mx-auto flex flex-col lg:flex-row lg:space-x-8 xl:space-x-16">
        {/* Content - take full width beside sidebar */}
        <div className="min-w-0 flex-1 w-full">
          <div className="mb-6">
            <Link className="btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300" href="/photoshoot">
              <svg className="fill-current text-gray-400 dark:text-gray-500 mr-2" width="7" height="12" viewBox="0 0 7 12">
                <path d="M5.4.6 6.8 2l-4 4 4 4-1.4 1.4L0 6z" />
              </svg>
              <span>Back To Photoshoot</span>
            </Link>
          </div>

          {/* Generated ads - first in the core section */}
          <div className="w-full">
            <GeneratedAdsGrid
              campaignId={campaign.id}
              generatedAds={campaign.generatedAds}
              favoriteAdIds={campaign.favoriteAdIds}
              userAvatarUrl={userAvatarUrl}
              status={campaign.status}
            />
          </div>
        </div>

        {/* Sidebar - same as post/page.tsx */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <CampaignActions campaignId={campaign.id} generatedAdUrls={campaign.generatedAdUrls} />
          </div>

          <FeedbackCard campaignId={campaign.id} initialRating={campaign.feedbackRating} />

          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-4">Original photos</div>
            {campaign.productPhotoUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {campaign.productPhotoUrls.map((url, i) => (
                  <div key={i} className="relative block aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      className="w-full h-full object-contain"
                      src={url}
                      alt={`Original product photo ${i + 1}`}
                      unoptimized
                      fill
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No product photos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
