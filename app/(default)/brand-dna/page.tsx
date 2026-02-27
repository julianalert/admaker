export const metadata = {
  title: 'Brand DNA',
  description: 'Build and view your Brand DNA profile from your website.',
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BrandDnaForm from './brand-dna-form'
import BrandDnaProfileDisplay from './brand-dna-profile'
import { getUserBrandDna } from './get-brand-dna'
import { isBrandDnaProfileEmpty } from '@/lib/brand-dna/types'

export default async function BrandDnaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  const brandDna = await getUserBrandDna()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      {!brandDna || isBrandDnaProfileEmpty(brandDna.profile) ? (
        <BrandDnaForm />
      ) : (
        <BrandDnaProfileDisplay websiteUrl={brandDna.website_url} profile={brandDna.profile} />
      )}
    </div>
  )
}
