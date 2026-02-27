export const metadata = {
  title: 'New campaign',
  description: 'Create your first AI product photo campaign. Upload your product and we generate studio-quality photos.',
}

import OnboardingHeader from '../onboarding-header'
import NewForm from './new-form'
import { getCampaignCount } from '../../(default)/photoshoot/get-campaigns'

export default async function NewPage() {
  const campaignCount = await getCampaignCount()
  return (
    <main className="bg-white dark:bg-gray-900">

      <div className="min-h-[100dvh] h-full flex flex-col">
        {/* Top bar - full width */}
        <div>
          <OnboardingHeader />
        </div>

        {/* Form + examples - full width, 2/3 + 1/3 on large screens */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <NewForm campaignCount={campaignCount} />
        </div>

      </div>

    </main>
  )
}
