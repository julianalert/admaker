import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import type { CampaignListItem } from './get-campaigns'

const CameraPlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-violet-400/70 dark:text-violet-400/50" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
)

export default function CampaignsPosts({ campaigns }: { campaigns: CampaignListItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={`/photoshoot/${campaign.id}`}
          className="group relative block aspect-[220/236] rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800 cursor-pointer"
        >
          <span className="absolute top-2 right-2 z-10 text-xs font-medium px-2 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
            {campaign.adCount} ad{campaign.adCount !== 1 ? 's' : ''}
          </span>

          {campaign.imageUrl ? (
            <>
              <Image
                className="object-cover object-center w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
                src={campaign.imageUrl}
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
            </>
          ) : (
            <>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-50 to-gray-100 dark:from-violet-950/30 dark:to-gray-800/80"
                aria-hidden
              >
                <CameraPlaceholderIcon />
                <span className="text-sm font-medium text-violet-600/90 dark:text-violet-400/80">
                  Photos coming soon
                </span>
              </div>
              <div
                className="absolute inset-x-0 bottom-0 pt-12 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none"
                aria-hidden
              />
              <span className="absolute bottom-0 left-0 right-0 px-3 py-2 text-sm font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {format(new Date(campaign.created_at), 'd MMM yyyy')}
              </span>
            </>
          )}
        </Link>
      ))}
    </div>
  )
}
