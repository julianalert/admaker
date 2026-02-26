import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCampaignDetail } from '../get-campaigns'
import CampaignActions from './campaign-actions'

export const metadata = {
  title: 'Campaign',
  description: 'Campaign detail and generated ads.',
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const campaign = await getCampaignDetail(id)
  if (!campaign) notFound()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page content - same layout as post/page.tsx, wider max so ad templates can expand */}
      <div className="max-w-[96rem] mx-auto flex flex-col lg:flex-row lg:space-x-8 xl:space-x-16">
        {/* Content - take full width beside sidebar */}
        <div className="min-w-0 flex-1 w-full">
          <div className="mb-6">
            <Link className="btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300" href="/campaigns">
              <svg className="fill-current text-gray-400 dark:text-gray-500 mr-2" width="7" height="12" viewBox="0 0 7 12">
                <path d="M5.4.6 6.8 2l-4 4 4 4-1.4 1.4L0 6z" />
              </svg>
              <span>Back To Campaigns</span>
            </Link>
          </div>

          {/* Generated ads - first in the core section */}
          <div className="w-full">
            <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-2">Generated ads ({campaign.generatedAdUrls.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6 w-full">
              {campaign.generatedAdUrls.map((url, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Generated ad ${i + 1}`} className="w-full h-auto block" />
                </div>
              ))}
            </div>
            {campaign.generatedAdUrls.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 my-6">No generated ads yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar - same as post/page.tsx */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <CampaignActions campaignId={campaign.id} generatedAdUrls={campaign.generatedAdUrls} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-4">Original photo</div>
            {campaign.productPhotoUrls.length > 0 ? (
              <div className="relative block aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <Image
                  className="w-full h-full object-contain"
                  src={campaign.productPhotoUrls[0]}
                  alt="Original product photo"
                  unoptimized
                  fill
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No product photo.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
