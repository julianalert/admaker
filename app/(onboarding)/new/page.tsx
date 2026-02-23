export const metadata = {
  title: 'New - Mosaic',
  description: 'Create your first ad campaign',
}

import Link from 'next/link'
import OnboardingHeader from '../onboarding-header'
import OnboardingUpload from '../onboarding-upload'

export default function NewPage() {
  return (
    <main className="bg-white dark:bg-gray-900">

      <div className="min-h-[100dvh] h-full flex flex-col">
        {/* Top bar - full width */}
        <div>
          <OnboardingHeader />
        </div>

        {/* Form - centered */}
        <div className="px-4 py-8 flex justify-center">
          <div className="w-full max-w-md">

                <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Your product in 5 scroll-stopping Ads, for free</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Upload one photo of your product. Get 4K ad creatives in 30 seconds. No designer. No photoshoot.</p>
                {/* Form */}
                <form>
                  <OnboardingUpload />
                  <div className="flex items-center justify-between">
                    <Link className="btn w-full justify-center bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white" href="/onboarding-02">Create my ads</Link>
                  </div>
                </form>

          </div>
        </div>

      </div>

    </main>
  )
}
