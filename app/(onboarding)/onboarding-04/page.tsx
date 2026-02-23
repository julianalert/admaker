export const metadata = {
  title: "Company information - Mosaic",
  description: 'Page description',
}

import Link from 'next/link'
import OnboardingHeader from '../onboarding-header'

export default function Onboarding04() {
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

                <div className="text-center">
                  <svg className="inline-flex w-16 h-16 fill-current mb-6" viewBox="0 0 64 64">
                    <circle className="text-green-500/20" cx="32" cy="32" r="32" />
                    <path className="text-green-700" d="M37.22 26.375a1 1 0 1 1 1.56 1.25l-8 10a1 1 0 0 1-1.487.082l-4-4a1 1 0 0 1 1.414-1.414l3.21 3.21 7.302-9.128Z" />
                  </svg>
                  <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Nice to have you, Acme Inc. 🙌</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">You’re all set. Head to your dashboard to create your first ads.</p>
                  <Link className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white" href="/dashboards">Go To Dashboard -&gt;</Link>
                </div>

          </div>
        </div>

      </div>

    </main>
  )
}
