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

type Props = {
  websiteUrl: string
  profile: BrandDnaProfile
}

export default function BrandDnaProfileDisplay({ websiteUrl, profile }: Props) {
  return (
    <div className="grow bg-white dark:bg-gray-900 flex flex-col">
      {/* Header area - similar to Profile template */}
      <div className="relative h-32 bg-gray-200 dark:bg-gray-800/50 rounded-t-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-violet-600/10 dark:from-violet-500/10 dark:to-violet-600/5" />
        <div className="absolute bottom-4 left-4 sm:left-6">
          <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">Brand DNA</h1>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 mt-1 inline-block truncate max-w-full"
          >
            {websiteUrl}
          </a>
        </div>
      </div>

      {/* Content - profile sections like Profile template */}
      <div className="relative px-4 sm:px-6 pb-8">
        <div className="flex flex-col xl:flex-row xl:space-x-16">
          {/* Main content */}
          <div className="flex-1 space-y-6 mb-8 xl:mb-0">
            {SECTIONS.map(({ key, label }) => {
              const value = profile[key]
              if (!value || typeof value !== 'string' || value.trim() === '') return null
              return (
                <div key={key}>
                  <h2 className="text-gray-800 dark:text-gray-100 font-semibold mb-2">{label}</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-sm">
                    {value}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar - regenerate CTA */}
          <aside className="xl:min-w-[14rem] xl:w-[14rem] space-y-4">
            <div className="text-sm">
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Source</h3>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 break-all"
              >
                {websiteUrl}
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              To regenerate your Brand DNA from a different or updated page, use the form below.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:text-violet-500">
                Regenerate from another URL
              </summary>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                <BrandDnaForm compact />
              </div>
            </details>
          </aside>
        </div>
      </div>
    </div>
  )
}
