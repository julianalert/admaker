export const metadata = {
  title: 'Brand DNA',
  description: 'Build and view your Brand DNA profile from your website.',
}

/** Always use current cookie so the displayed brand matches the switcher; avoid deleting the wrong brand. */
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BrandDnaForm from './brand-dna-form'
import BrandDnaProfileDisplay from './brand-dna-profile'
import { getUserBrandDna } from './get-brand-dna'
import { isBrandDnaProfileEmpty } from '@/lib/brand-dna/types'
import { getBrands, getDefaultBrandId } from '@/lib/brands'

export default async function BrandDnaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  const [brands, defaultBrandId] = await Promise.all([getBrands(), getDefaultBrandId()])
  const brandDna = await getUserBrandDna(defaultBrandId ?? undefined)

  if (brands.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Set up your first brand with your website URL to get started.
        </p>
        <Link
          href="/onboarding/brand"
          className="btn inline-flex bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Set up your brand
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {!brandDna || isBrandDnaProfileEmpty(brandDna.profile) ? (
        <BrandDnaForm currentBrandId={defaultBrandId} />
      ) : (
        <BrandDnaProfileDisplay
          websiteUrl={brandDna.website_url}
          profile={brandDna.profile}
          currentBrandId={defaultBrandId}
        />
      )}
      {brands.length > 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/onboarding/brand" className="underline hover:no-underline">
            Add another brand
          </Link>
        </p>
      )}
    </div>
  )
}
