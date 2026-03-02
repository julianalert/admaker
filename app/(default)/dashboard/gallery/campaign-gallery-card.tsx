'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import type { CampaignGalleryItem } from '@/app/(default)/photoshoot/get-campaigns'

const DEFAULT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12"%3ENo image%3C/text%3E%3C/svg%3E'

type CampaignGalleryCardProps = {
  campaign: CampaignGalleryItem
}

export default function CampaignGalleryCard({ campaign }: CampaignGalleryCardProps) {
  const { id, created_at, photoUrls } = campaign
  const count = photoUrls.length

  // 3 columns; adapt layout: 1 = single, 2 = 2 cols, 3+ = 3 cols
  const gridCols = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="col-span-full bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Card header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {format(new Date(created_at), 'd MMM yyyy')}
          </span>
          <Link
            href={`/photoshoot/${id}`}
            className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:text-violet-400"
          >
            View photoshoot →
          </Link>
        </div>

        {/* Photo grid: 3 columns, responsive, adapts to count */}
        <div className="p-4">
          {count === 0 ? (
            <div className="aspect-square max-w-xs mx-auto rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">No photos yet</span>
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
              {photoUrls.map((url, i) => (
                <div
                  key={`${id}-${i}`}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700/50"
                >
                  <Image
                    src={url || DEFAULT_IMAGE}
                    alt={`Campaign photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 220px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
