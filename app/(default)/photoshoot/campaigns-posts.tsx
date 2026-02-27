import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import type { CampaignListItem } from './get-campaigns'

const DEFAULT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="220" height="236" viewBox="0 0 220 236"%3E%3Crect fill="%23e5e7eb" width="220" height="236"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E'

export default function CampaignsPosts({ campaigns }: { campaigns: CampaignListItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={`/photoshoot/${campaign.id}`}
          className="group relative block aspect-[220/236] rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800"
        >
          <Image
            className="object-cover object-center w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
            src={campaign.imageUrl ?? DEFAULT_IMAGE}
            width={220}
            height={236}
            alt="Photoshoot"
            unoptimized
          />
          <div
            className="absolute inset-x-0 bottom-0 pt-12 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none"
            aria-hidden
          />
          <span className="absolute bottom-0 left-0 right-0 px-3 py-2 text-sm font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {format(new Date(campaign.created_at), 'd MMM yyyy')}
          </span>
        </Link>
      ))}
    </div>
  )
}
