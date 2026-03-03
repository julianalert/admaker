'use client'

import Image from 'next/image'

const TAGLINE_BADGE_CLASS = 'text-xs inline-flex font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-center px-2.5 py-1 mb-4'

type ExamplesBlockProps = {
  photoCount: string
  useCreativeFiveImage?: boolean
  singlePhotoMode?: boolean
}

export default function ExamplesBlock({ photoCount, useCreativeFiveImage, singlePhotoMode }: ExamplesBlockProps) {
  if (singlePhotoMode) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <span className={TAGLINE_BADGE_CLASS}>🧠 Agency quality without the budget, timeline or delays</span>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
            Example of the output you&apos;ll get:
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
            <Image
              src="/examples/ai-product-photography2.png"
              alt="Example: single AI product photo"
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

  if (photoCount === '9') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <span className={TAGLINE_BADGE_CLASS}>🧠  Agency quality without the budget, timeline or delays</span>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
            Example of the output you&apos;ll get:
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
            <Image
              src="/examples/9photos-bg.png"
              alt="Example: 9-photo pack including macro detail and social hook"
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

  // 5 photos (default)
  return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-5">
          <span className={TAGLINE_BADGE_CLASS}>🧠 Agency quality without the budget, timeline or delays</span>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
            Example of the output you&apos;ll get:
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
            <Image
              src={useCreativeFiveImage ? '/examples/exemple5photosCreative.png' : '/examples/exemple5photos.png'}
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

