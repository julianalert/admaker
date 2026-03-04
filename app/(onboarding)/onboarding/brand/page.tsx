'use client'

import { useState } from 'react'
import OnboardingHeader from '../../onboarding-header'
import { createBrandAndDna } from '@/app/(default)/brand-dna/actions'

const CURRENT_BRAND_ID_COOKIE = 'current_brand_id'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

function setCurrentBrandIdCookie(brandId: string): void {
  document.cookie = `${CURRENT_BRAND_ID_COOKIE}=${encodeURIComponent(brandId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export default function OnboardingBrandPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await createBrandAndDna(url)
      if ('error' in result) {
        setError(result.error)
        return
      }
      if (result.isFirstBrand) {
        window.location.assign('/new')
      } else {
        setCurrentBrandIdCookie(result.brandId)
        window.location.assign('/photoshoot')
      }
      return
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="min-h-[100dvh] h-full flex flex-col">
        <div>
          <OnboardingHeader />
        </div>
        <div className="px-4 py-8 flex justify-center flex-1">
          <div className="w-full max-w-md">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-500/20 mb-6" aria-hidden>
                  <svg className="animate-spin h-7 w-7 text-violet-600 dark:text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Building your Brand DNA
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                  We&apos;re analyzing your website and extracting your brand profile. This usually takes 1–2 minutes.
                </p>
                <ul className="mt-6 text-left max-w-xs mx-auto space-y-2 text-sm text-gray-600 dark:text-gray-400" aria-hidden>
                  <li className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Reading your website
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Extracting brand voice & audience
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Creating your Brand DNA profile
                  </li>
                </ul>
                <p className="mt-8 text-sm font-medium text-amber-700 dark:text-amber-400" role="status">
                  Do not close this tab.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">
                    Set up your brand
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Enter your website URL. We&apos;ll analyze it and create your Brand DNA so your photoshoots match your brand.
                  </p>
                </div>
                <form onSubmit={handleSubmit}>
                  <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Your website URL
                  </label>
                  <input
                    id="website-url"
                    name="websiteUrl"
                    type="url"
                    placeholder="https://yourbrand.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="form-input w-full mb-4"
                    disabled={loading}
                    required
                  />
                  {error && (
                    <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn cursor-pointer w-full justify-center bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                  >
                    Continue
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
