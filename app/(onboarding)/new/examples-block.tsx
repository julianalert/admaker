'use client'

import Image from 'next/image'

const TAGLINE_BADGE_CLASS = 'text-xs inline-flex font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-center px-2.5 py-1 mb-4'

type ExamplesBlockProps = {
  photoCount: string
}

export default function ExamplesBlock({ photoCount }: ExamplesBlockProps) {
  if (photoCount === '3') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            What you&apos;ll get with 3 photos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Studio + Studio 2 + Contextual
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
          <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700/60">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Better photos = higher conversion rate
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside pl-1">
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+18%</span>
                {' '}CTR on ads
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+12%</span>
                {' '}add-to-cart rate
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">3x</span>
                {' '}more saves on socials
              </li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3 px-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          Built with 💜 for Shopify, Amazon & DTC brands
        </p>
      </div>
    )
  }

  if (photoCount === '5') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            What you&apos;ll get with 5 photos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Studio + Studio 2 + Contextual + Product in use + Creative
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
          <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700/60">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Better photos = higher conversion rate
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside pl-1">
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+18%</span>
                {' '}CTR on ads
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+12%</span>
                {' '}add-to-cart rate
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">3x</span>
                {' '}more saves on socials
              </li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3 px-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          Built with 💜 for Shopify, Amazon & DTC brands
        </p>
      </div>
    )
  }

  if (photoCount === '7') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
            What you&apos;ll get with 7 photos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Studio + Studio 2 + Contextual + Lifestyle + Creative + UGC Styler + Cinematic
          </p>
          <span className={TAGLINE_BADGE_CLASS}>🧠 Agency quality + UGC + cinematic for ads &amp; social</span>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
            <Image
              src="/examples/exemple5photos.png"
              alt="Example: 7-photo pack with studio, lifestyle, in action, in use, creative, UGC styler, and cinematic"
              width={400}
              height={400}
              className="w-full h-auto"
            />
          </div>
          <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside pl-1">
            <li><strong>UGC Styler:</strong> Real person using the product, shot like iPhone UGC — all UGC codes.</li>
            <li><strong>Cinematic:</strong> Cool product-in-use shot with film-like lighting and composition.</li>
          </ul>
          <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700/60">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Better photos = higher conversion rate
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside pl-1">
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+18%</span>
                {' '}CTR on ads
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">+12%</span>
                {' '}add-to-cart rate
              </li>
              <li>
                <span className="font-medium text-violet-600 dark:text-violet-400">3x</span>
                {' '}more saves on socials
              </li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3 px-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          Built with 💜 for Shopify, Amazon & DTC brands
        </p>
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
