'use client'

import type { BrandDnaProfile } from '@/lib/brand-dna/types'
import BrandDnaForm from './brand-dna-form'

const SECTIONS: { key: keyof BrandDnaProfile; label: string }[] = [
  { key: 'valueProposition', label: 'Value Proposition' },
  { key: 'audienceIcp', label: 'Audience / ICP' },
  { key: 'coreProblem', label: 'Core Problem' },
  { key: 'icpLanguage', label: 'ICP Language' },
  { key: 'whatTheyWant', label: 'What They Want' },
  { key: 'objections', label: 'Objections' },
  { key: 'buyingTriggers', label: 'Buying Triggers' },
  { key: 'brandStory', label: 'Brand Story' },
  { key: 'missionVision', label: 'Mission & Vision' },
  { key: 'productsOffer', label: 'Products / Offer' },
  { key: 'brandVoiceTone', label: 'Brand Voice & Tone' },
  { key: 'keyDifferentiators', label: 'Key Differentiators' },
]

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Brand name from URL hostname, e.g. "stripe.com" → "Stripe" */
function getBrandName(url: string): string {
  const host = getHostname(url)
  const firstPart = host.split('.')[0] ?? host
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
}

/** Icon wrapper for section cards */
function SectionIcon({ className }: { className?: string }) {
  return (
    <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${className ?? 'bg-violet-500'}`}>
      <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
      </svg>
    </div>
  )
}

type Props = {
  websiteUrl: string
  profile: BrandDnaProfile
}

export default function BrandDnaProfileDisplay({ websiteUrl, profile }: Props) {
  const hostname = getHostname(websiteUrl)
  const brandName = getBrandName(websiteUrl)
  const hasCards = SECTIONS.some(({ key }) => {
    if (key === 'brandStory' || key === 'valueProposition') return false
    const v = profile[key]
    return typeof v === 'string' && v.trim() !== ''
  })

  return (
    <div className="grow bg-white dark:bg-gray-900 flex flex-col">
      {/* Cover: gradient (more visible) */}
      <div
        className="relative h-56 bg-gradient-to-br from-violet-200 via-violet-100 to-violet-50 dark:from-violet-900/70 dark:via-violet-950/50 dark:to-violet-950/40"
        aria-hidden
      />

      {/* Content */}
      <div className="relative px-4 sm:px-6 pb-8">
        {/* Pre-header: Avatar overlapping banner - like Profile */}
        <div className="-mt-16 mb-6 sm:mb-3">
          <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-end">
            {/* Avatar: purple bg + first letter of brand name */}
            <div className="inline-flex -ml-1 -mt-1 mb-4 sm:mb-0">
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 bg-violet-500 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white" aria-hidden>
                  {brandName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Actions: optional secondary CTA - main Regenerate is in sidebar */}
            <div className="flex space-x-2 sm:mb-2">
              <a
                href="#regenerate"
                className="btn-sm border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 cursor-pointer"
              >
                Regenerate from URL
              </a>
            </div>
          </div>
        </div>

        {/* Header: name, bio, meta - like Profile */}
        <header className="text-center sm:text-left mb-6">
          <div className="inline-flex items-start mb-2">
            <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">{brandName}</h1>
          </div>
          {/* Bio = value proposition or short description */}
          {(profile.valueProposition ?? profile.brandStory) && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
              {profile.valueProposition ?? (typeof profile.brandStory === 'string' ? profile.brandStory.slice(0, 200) + (profile.brandStory.length > 200 ? '…' : '') : '')}
            </div>
          )}
          {/* Tags only (no link line before) */}
          {(profile.industry ?? profile.niche ?? profile.tone ?? profile.price_positioning) && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm">
              {profile.industry && <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-0.5">{profile.industry}</span>}
              {profile.niche && <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-0.5">{profile.niche}</span>}
              {profile.tone && <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-0.5">{profile.tone}</span>}
              {profile.price_positioning && <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-0.5">{profile.price_positioning}</span>}
            </div>
          )}
          {Array.isArray(profile.regions) && profile.regions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Regions:</span>
              {profile.regions.join(', ')}
            </div>
          )}
        </header>

        {/* Tabs - single "Overview" like Profile has "General" */}
        <div className="relative mb-6">
          <div className="absolute bottom-0 w-full h-px bg-gray-200 dark:bg-gray-700/60" aria-hidden />
          <ul className="relative text-sm font-medium flex flex-nowrap -mx-4 sm:-mx-6 overflow-x-scroll no-scrollbar">
            <li className="mr-6 last:mr-0 first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6">
              <span className="block pb-3 text-violet-500 whitespace-nowrap border-b-2 border-violet-500">
                Overview
              </span>
            </li>
          </ul>
        </div>

        {/* Profile content: main + sidebar - like Profile */}
        <div className="flex flex-col xl:flex-row xl:space-x-16">
          {/* Main content */}
          <div className="flex-1 space-y-5 mb-8 xl:mb-0">
            {/* About Me = Brand Story / Value proposition - only if we have content */}
            {((profile.valueProposition?.trim() ?? '') !== '' || (profile.brandStory?.trim() ?? '') !== '') && (
              <div>
                <h2 className="text-gray-800 dark:text-gray-100 font-semibold mb-2">About</h2>
                <div className="text-sm space-y-2">
                  {profile.valueProposition?.trim() && (
                    <p className="font-medium text-gray-800 dark:text-gray-100">{profile.valueProposition}</p>
                  )}
                  {profile.brandStory?.trim() && (
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{profile.brandStory}</p>
                  )}
                </div>
              </div>
            )}

            {/* Cards section - like Departments on Profile */}
            {hasCards && (
              <div>
                <h2 className="text-gray-800 dark:text-gray-100 font-semibold mb-2">Brand Profile</h2>
                <div className="grid xl:grid-cols-2 gap-4">
                  {SECTIONS.map(({ key, label }) => {
                    if (key === 'brandStory' || key === 'valueProposition') return null
                    const value = profile[key]
                    if (!value || typeof value !== 'string' || value.trim() === '') return null
                    return (
                      <div
                        key={key}
                        className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-sm"
                      >
                        <div className="grow flex items-center truncate mb-2">
                          <SectionIcon />
                          <div className="truncate ml-2">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {value}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar - like Profile */}
          <aside className="xl:min-w-[14rem] xl:w-[14rem] space-y-3">
            <div className="text-sm">
              <h3 className="font-medium text-gray-800 dark:text-gray-100">Source</h3>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 break-all mt-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                {hostname}
              </a>
            </div>
            {profile.industry && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Industry</h3>
                <div className="text-gray-600 dark:text-gray-300">{profile.industry}</div>
              </div>
            )}
            {profile.niche && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Niche</h3>
                <div className="text-gray-600 dark:text-gray-300">{profile.niche}</div>
              </div>
            )}
            <div className="text-sm">
              <h3 className="font-medium text-gray-800 dark:text-gray-100">Voice &amp; Tone</h3>
              <div className="text-gray-600 dark:text-gray-300">
                {(profile.tone ?? profile.brandVoiceTone?.trim()) || '—'}
              </div>
            </div>
            {profile.price_positioning && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Price positioning</h3>
                <div className="text-gray-600 dark:text-gray-300">{profile.price_positioning}</div>
              </div>
            )}
            {Array.isArray(profile.regions) && profile.regions.length > 0 && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Regions</h3>
                <div className="text-gray-600 dark:text-gray-300">{profile.regions.join(', ')}</div>
              </div>
            )}
            <div className="text-sm">
              <h3 className="font-medium text-gray-800 dark:text-gray-100">Products / Offer</h3>
              <div className="text-gray-600 dark:text-gray-300 line-clamp-3">
                {profile.productsOffer?.trim() || '—'}
              </div>
            </div>
            {Array.isArray(profile.keywords) && profile.keywords.length > 0 && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Keywords</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.keywords.map((kw) => (
                    <span key={kw} className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.heuristics?.niche_tags && profile.heuristics.niche_tags.length > 0 && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.heuristics.niche_tags.map((tag) => (
                    <span key={tag} className="text-xs rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.heuristics?.currency_regions && profile.heuristics.currency_regions.length > 0 && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Currency / regions</h3>
                <ul className="text-gray-600 dark:text-gray-300 space-y-0.5 text-xs">
                  {profile.heuristics.currency_regions.map((cr, i) => (
                    <li key={i}><span className="font-medium">{cr.symbol}</span> → {cr.region}{cr.reasoning ? ` (${cr.reasoning})` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.heuristics?.notes && (
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Notes</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">{profile.heuristics.notes}</div>
              </div>
            )}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700/60" id="regenerate">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Update your Brand DNA profile from an updated URL.
              </p>
              <BrandDnaForm compact />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
