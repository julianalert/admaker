export const metadata = {
  title: 'Credits - Mosaic',
  description: 'Page description',
}

import CreditsPanel from './credits-panel'

export default function CreditsSettings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Credits</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl mb-8">
        <CreditsPanel />
      </div>

    </div>
  )
}
