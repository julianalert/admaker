import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { getCampaignDetail } from '../get-campaigns'
import UserImage01 from '@/public/images/user-32-01.jpg'
import UserImage02 from '@/public/images/user-32-02.jpg'
import UserImage03 from '@/public/images/user-32-03.jpg'
import UserImage04 from '@/public/images/user-32-04.jpg'
import UserImage05 from '@/public/images/user-32-05.jpg'
import UserImage06 from '@/public/images/user-32-06.jpg'
import UserImage07 from '@/public/images/user-32-07.jpg'
import UserImage08 from '@/public/images/user-32-08.jpg'

export const metadata = {
  title: 'Campaign - Mosaic',
  description: 'Campaign detail',
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect fill="%23e5e7eb" width="640" height="360"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16"%3ECampaign%3C/text%3E%3C/svg%3E'

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const campaign = await getCampaignDetail(id)
  if (!campaign) notFound()

  const heroImageUrl = campaign.generatedAdUrls[0] ?? campaign.productPhotoUrls[0] ?? PLACEHOLDER_IMAGE

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page content - same layout as post/page.tsx */}
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:space-x-8 xl:space-x-16">
        {/* Content */}
        <div>
          <div className="mb-6">
            <Link className="btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300" href="/campaigns">
              <svg className="fill-current text-gray-400 dark:text-gray-500 mr-2" width="7" height="12" viewBox="0 0 7 12">
                <path d="M5.4.6 6.8 2l-4 4 4 4-1.4 1.4L0 6z" />
              </svg>
              <span>Back To Campaigns</span>
            </Link>
          </div>
          <div className="text-sm font-semibold text-violet-500 uppercase mb-2">{format(new Date(campaign.created_at), 'EEE d MMM, yyyy')}</div>
          <header className="mb-4">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Campaign</h1>
            <p>Here is a short desc</p>
          </header>

          {/* Meta - same as post */}
          <div className="space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0 mb-6">
            <div className="flex items-center sm:mr-4">
              <a className="block mr-2 shrink-0" href="#0">
                <Image className="rounded-full" src={UserImage07} width={32} height={32} alt="User 04" />
              </a>
              <div className="text-sm whitespace-nowrap">
                Hosted by{' '}
                <a className="font-semibold text-gray-800 dark:text-gray-100" href="#0">
                  Monica Fishkin
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center sm:justify-end space-x-2">
              <div className="text-xs inline-flex items-center font-medium border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 rounded-full text-center px-2.5 py-1">
                <svg className="w-4 h-3 fill-gray-400 dark:fill-gray-500 mr-2" viewBox="0 0 16 12">
                  <path d="m16 2-4 2.4V2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.6l4 2.4V2ZM2 10V2h8v8H2Z" />
                </svg>
                <span>Online Event</span>
              </div>
              <div className="text-xs inline-flex font-medium uppercase bg-green-500/20 text-green-700 rounded-full text-center px-2.5 py-1">
                Free
              </div>
            </div>
          </div>

          {/* Hero image - first generated ad or first product photo */}
          <figure className="mb-6">
            <Image className="w-full rounded-xs" src={heroImageUrl} width={640} height={360} alt="Campaign" unoptimized />
          </figure>

          {/* Original photos - same section style as Photos (3) in post */}
          <div>
            <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-2">Original photos ({campaign.productPhotoUrls.length})</h2>
            <div className="grid grid-cols-3 gap-4 my-6">
              {campaign.productPhotoUrls.map((url, i) => (
                <div key={i} className="relative block aspect-[203/152] rounded-xs overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image className="w-full h-full object-cover" src={url} alt={`Product photo ${i + 1}`} unoptimized fill />
                </div>
              ))}
            </div>
            {campaign.productPhotoUrls.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 my-6">No product photos.</p>
            )}
          </div>

          <hr className="my-6 border-t border-gray-100 dark:border-gray-700/60" />

          {/* Generated ads - same section style */}
          <div>
            <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-2">Generated ads ({campaign.generatedAdUrls.length})</h2>
            <div className="grid grid-cols-3 gap-4 my-6">
              {campaign.generatedAdUrls.map((url, i) => (
                <div key={i} className="relative block aspect-[203/152] rounded-xs overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image className="w-full h-full object-cover" src={url} alt={`Generated ad ${i + 1}`} unoptimized fill />
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
            <div className="space-y-2">
              <button className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">
                <svg className="fill-current shrink-0" width="16" height="16" viewBox="0 0 16 16">
                  <path d="m2.457 8.516.969-.99 2.516 2.481 5.324-5.304.985.989-6.309 6.284z" />
                </svg>
                <span className="ml-1">Attending</span>
              </button>
              <button className="btn w-full border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">
                <svg className="fill-red-500 shrink-0" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M14.682 2.318A4.485 4.485 0 0 0 11.5 1 4.377 4.377 0 0 0 8 2.707 4.383 4.383 0 0 0 4.5 1a4.5 4.5 0 0 0-3.182 7.682L8 15l6.682-6.318a4.5 4.5 0 0 0 0-6.364Zm-1.4 4.933L8 12.247l-5.285-5A2.5 2.5 0 0 1 4.5 3c1.437 0 2.312.681 3.5 2.625C9.187 3.681 10.062 3 11.5 3a2.5 2.5 0 0 1 1.785 4.251h-.003Z" />
                </svg>
                <span className="ml-2">Favorite</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <div className="flex justify-between space-x-1 mb-5">
              <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold">Attendees (127)</div>
              <a className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="#0">
                View All
              </a>
            </div>
            <ul className="space-y-3">
              <li>
                <div className="flex justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage08} width={32} height={32} alt="User 08" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Carolyn McNeail</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-full">
                    <span className="sr-only">Menu</span>
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="2" />
                      <circle cx="10" cy="16" r="2" />
                      <circle cx="22" cy="16" r="2" />
                    </svg>
                  </button>
                </div>
              </li>
              <li>
                <div className="flex justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage01} width={32} height={32} alt="User 01" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Dominik Lamakani</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-full">
                    <span className="sr-only">Menu</span>
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="2" />
                      <circle cx="10" cy="16" r="2" />
                      <circle cx="22" cy="16" r="2" />
                    </svg>
                  </button>
                </div>
              </li>
              <li>
                <div className="flex justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage03} width={32} height={32} alt="User 03" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Ivan Mesaros</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-full">
                    <span className="sr-only">Menu</span>
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="2" />
                      <circle cx="10" cy="16" r="2" />
                      <circle cx="22" cy="16" r="2" />
                    </svg>
                  </button>
                </div>
              </li>
              <li>
                <div className="flex justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage05} width={32} height={32} alt="User 05" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Maria Martinez</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-full">
                    <span className="sr-only">Menu</span>
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="2" />
                      <circle cx="10" cy="16" r="2" />
                      <circle cx="22" cy="16" r="2" />
                    </svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
            <div className="flex justify-between space-x-1 mb-5">
              <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold">Invite Friends</div>
              <a className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="#0">
                View All
              </a>
            </div>
            <ul className="space-y-3">
              <li>
                <div className="flex items-center justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage02} width={32} height={32} alt="User 02" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Haruki Masuno</span>
                    </div>
                  </div>
                  <button className="btn-xs text-xs border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full shadow-none">
                    Invite
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage04} width={32} height={32} alt="User 04" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Joe Huang</span>
                    </div>
                  </div>
                  <button className="btn-xs text-xs border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full shadow-none">
                    Invite
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage06} width={32} height={32} alt="User 06" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Carolyn McNeail</span>
                    </div>
                  </div>
                  <button className="btn-xs text-xs border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full shadow-none">
                    Invite
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center justify-between">
                  <div className="grow flex items-center">
                    <div className="relative mr-3">
                      <Image className="w-8 h-8 rounded-full" src={UserImage08} width={32} height={32} alt="User 08" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Lisa Sitwala</span>
                    </div>
                  </div>
                  <button className="btn-xs text-xs border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full shadow-none">
                    Invite
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
