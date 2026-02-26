'use client'

import Image from 'next/image'

const TAGLINE_BADGE_CLASS = 'text-xs inline-flex font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-center px-2.5 py-1 mb-4'

type ExamplesBlockProps = {
  photoCount: string
}

export default function ExamplesBlock({ photoCount }: ExamplesBlockProps) {
  if (photoCount === '3') {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            What you&apos;ll get with 3 photos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Studio + Studio 2 + Contextual Photos
          </p>
          <span className={TAGLINE_BADGE_CLASS}>🧠  Agency quality without the budget, timeline or delays</span>
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
              <Image
                src="/examples/3photos-bag.png"
                alt="Example: bag in original, studio, studio 2, and contextual shots"
                width={400}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
              <Image
                src="/examples/3photos-candle.png"
                alt="Example: candle in original, studio, studio 2, and contextual shots"
                width={400}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
              <Image
                src="/examples/3photos-truck.png"
                alt="Example: toy truck in original, studio, lifestyle, and contextual shots"
                width={400}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (photoCount === '5') {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            What you&apos;ll get with 5 photos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Studio + Lifestyle + In action + Product in use + Non-obvious context
          </p>
          <span className={TAGLINE_BADGE_CLASS}>🧠 Agency quality without the budget, timeline or delays</span>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
            <Image
              src="/examples/exemple5photos.png"
              alt="Example: 5-photo pack with studio, lifestyle, in action, in use, and creative context"
              width={400}
              height={400}
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    )
  }

  if (photoCount === '9') {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-center min-h-[120px]">
        <span className="text-xs text-gray-400 dark:text-gray-500">9 photos — Coming soon</span>
      </div>
    )
  }

  return null
}
