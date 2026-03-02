export const metadata = {
  title: 'Test image generation',
  description: 'Test each image type individually without running a full photoshoot.',
}

/** Allow long-running server action for single image generation. */
export const maxDuration = 120

import OnboardingHeader from '../onboarding-header'
import TestForm from './test-form'

export default function TestPage() {
  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="min-h-[100dvh] h-full flex flex-col">
        <div>
          <OnboardingHeader />
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <TestForm />
        </div>
      </div>
    </main>
  )
}
