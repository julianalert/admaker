export const metadata = {
  title: 'Credits',
  description: 'Buy credits for AI product photos. Pay as you go — 4K quality, unlimited products and photoshoots.',
}

import { Suspense } from 'react'
import CreditsPanel from './credits-panel'

export default function CreditsSettings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Credits</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl mb-8">
        <Suspense fallback={<div className="p-6 min-h-[200px]" />}>
          <CreditsPanel />
        </Suspense>
      </div>

    </div>
  )
}
