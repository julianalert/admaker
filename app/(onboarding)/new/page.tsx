export const metadata = {
  title: 'New campaign',
  description: 'Create your first AI product photo campaign. Upload your product and we generate studio-quality photos.',
}

/**
 * Allow long-running Server Action for multi-photo generation (runPhotoshootGeneration).
 * Vercel: Hobby max 300s, Pro/Enterprise max 800s (with fluid compute).
 * 10 min gives headroom for 5–9 images; increase to 800 if on Pro and still timing out.
 */
export const maxDuration = 600

import OnboardingHeader from '../onboarding-header'
import NewForm from './new-form'
import { getCampaignCount } from '../../(default)/photoshoot/get-campaigns'
import { getBrandCount } from '@/lib/brands'

export default async function NewPage() {
  const [campaignCount, brandCount] = await Promise.all([
    getCampaignCount(),
    getBrandCount(),
  ])
  return (
    <main className="bg-white dark:bg-gray-900">

      <div className="min-h-[100dvh] h-full flex flex-col">
        {/* Top bar - full width */}
        <div>
          <OnboardingHeader />
        </div>

        {/* Form + examples - full width, 2/3 + 1/3 on large screens */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <NewForm campaignCount={campaignCount} brandCount={brandCount} />
        </div>

      </div>

    </main>
  )
}
