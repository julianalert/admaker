export const metadata = {
  title: 'New - Mosaic',
  description: 'Create your first ad campaign',
}

import OnboardingHeader from '../onboarding-header'
import NewForm from './new-form'

export default function NewPage() {
  return (
    <main className="bg-white dark:bg-gray-900">

      <div className="min-h-[100dvh] h-full flex flex-col">
        {/* Top bar - full width */}
        <div>
          <OnboardingHeader />
        </div>

        {/* Form + examples - full width, 2/3 + 1/3 on large screens */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <NewForm />
        </div>

      </div>

    </main>
  )
}
