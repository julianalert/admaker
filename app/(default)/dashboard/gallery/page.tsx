export const metadata = {
  title: 'Campaign Gallery',
  description: 'View your campaign photos in a gallery.',
}

import Link from 'next/link'
import { getCampaignsForGallery } from '@/app/(default)/photoshoot/get-campaigns'
import CampaignGalleryCard from './campaign-gallery-card'
import GalleryPagination from './gallery-pagination'

const PER_PAGE = 3

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1)
  const { campaigns, totalCount, totalPages, page: currentPage } = await getCampaignsForGallery(
    page,
    PER_PAGE
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">

      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">

        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Campaign Gallery
          </h1>
        </div>

        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          <Link
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            href="/photoshoot"
          >
            My photoshoots
          </Link>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {totalCount} campaign{totalCount !== 1 ? 's' : ''} · 3 per page
      </p>

      {/* Cards: one per campaign, each with 3-column photo grid */}
      <div className="grid grid-cols-12 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No campaigns yet.</p>
            <Link
              href="/new"
              className="btn bg-violet-500 text-white hover:bg-violet-600"
            >
              Create a photoshoot
            </Link>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <CampaignGalleryCard key={campaign.id} campaign={campaign} />
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-8">
        <GalleryPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  )
}
