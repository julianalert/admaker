'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import OnboardingUpload from '../onboarding-upload'
import DropdownSelect from '@/components/dropdown-select'
import Banner02 from '@/components/banner-02'
import { createCampaignWithStudioPhoto, createCampaignUltraRealistic, createCampaignSinglePhoto, runPhotoshootGeneration } from './actions'
import ExamplesBlock from './examples-block'
import CreatingPhotoshootAnimation from './creating-photoshoot-animation'
import CreatingPhotoshootSimple from './creating-photoshoot-simple'
import Avatar01 from '@/public/images/avatar-01.jpg'
import Avatar02 from '@/public/images/avatar-02.jpg'
import Avatar03 from '@/public/images/avatar-03.jpg'
import Avatar04 from '@/public/images/avatar-04.jpg'

type ShootMode = 'creative' | 'ultra' | 'single'

const CREATIVE_PHOTO_COUNT_OPTIONS = [
  { value: '5', label: '5 photos' },
  { value: '9', label: '9 photos' },
] as const

/** Product Photoshoot uses the same options as Brand (5 or 9 photos). */
const PRODUCT_PHOTO_COUNT_OPTIONS = [
  { value: '5', label: '5 photos' },
  { value: '9', label: '9 photos' },
] as const

const FORMAT_OPTIONS = [
  { value: '1:1', label: '1:1 (Product Page)' },
  { value: '9:16', label: '9:16 (Story)' },
  { value: '16:9', label: '16:9 (Website)' },
  { value: '4:3', label: '4:3 (Regular visual)' },
  { value: '4:5', label: '4:5 (Portrait)' },
  { value: '5:4', label: '5:4 (Post)' },
] as const

const QUALITY_OPTIONS = [
  { value: '2K', label: '2K (1 credit/image)' },
  { value: '4K', label: '4K (2 credits/image)' },
] as const

const BADGE_CLASS = 'text-xs inline-flex font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-center px-2.5 py-1'

const CARD_BASE =
  'h-full text-center bg-white dark:bg-gray-800 px-4 py-6 rounded-lg border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm transition'
const CARD_CHECKED_RING = 'absolute inset-0 border-2 border-transparent peer-checked:border-violet-400 dark:peer-checked:border-violet-500 rounded-lg pointer-events-none'

/** Set to true to show the Product Photoshoot card (same workflow as Brand, no Brand DNA). */
const SHOW_PRODUCT_PHOTOSHOOT = true

export default function NewForm({ campaignCount = 0, brandCount = 1 }: { campaignCount?: number; brandCount?: number }) {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<ShootMode>('creative')
  const [creativePhotoCount, setCreativePhotoCount] = useState<string>('5')
  const [productPhotoCount, setProductPhotoCount] = useState<string>('5')
  const [format, setFormat] = useState<string>('9:16')
  const [productFormat, setProductFormat] = useState<string>('1:1')
  const [quality, setQuality] = useState<string>('4K')
  const [customPrompt, setCustomPrompt] = useState('')
  const [clientGuidelines, setClientGuidelines] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const photoCountForAnimation =
    mode === 'creative' ? creativePhotoCount : mode === 'ultra' ? productPhotoCount : '1'
  const photoCountForExamples = mode === 'single' ? '5' : photoCountForAnimation

  /** First-time experience: only one brand and no campaigns yet. Show badges and simple flow. */
  const isFirstBrandExperience = campaignCount === 0 && brandCount === 1
  /** Regular experience: show Creative/Ultra/Single card selector (either has campaigns or has multiple brands). */
  const showCardSelector = campaignCount > 0 || brandCount > 1

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => {
      window.location.href = '/photoshoot'
    }, 120_000)
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (files.length === 0) {
      setError('Please add at least one product photo.')
      return
    }
    if (showCardSelector && mode === 'single' && !customPrompt.trim()) {
      setError('Please describe the shot you want.')
      return
    }
    setLoading(true)
    const formData = new FormData()
    files.forEach((f) => formData.append('photos', f))
    formData.set('format', mode === 'ultra' ? productFormat : format)
    formData.set('quality', quality)

    let actionPromise: Promise<{ error?: string; campaignId?: string }>
    if (!showCardSelector || mode === 'creative') {
      formData.set('photoCount', creativePhotoCount)
      formData.set('clientGuidelines', clientGuidelines.trim())
      actionPromise = createCampaignWithStudioPhoto(formData)
    } else if (mode === 'ultra') {
      formData.set('photoCount', productPhotoCount)
      formData.set('clientGuidelines', clientGuidelines.trim())
      actionPromise = createCampaignUltraRealistic(formData)
    } else {
      formData.set('customPrompt', customPrompt.trim())
      actionPromise = createCampaignSinglePhoto(formData)
    }

    actionPromise
      .then((result) => {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current)
          redirectTimeoutRef.current = null
        }
        if (result && 'error' in result) {
          setError(result.error ?? null)
          setLoading(false)
          return
        }
        const id = result && typeof result === 'object' && 'campaignId' in result ? (result as { campaignId: string }).campaignId : null
        if (id) {
          // Start generation in background (don't await)
          runPhotoshootGeneration(id).catch(() => { /* errors surface as campaign status failed */ })
          // Redirect to photoshoot page after 5s so user sees animation then lands on campaign
          redirectTimeoutRef.current = setTimeout(() => {
            redirectTimeoutRef.current = null
            window.location.assign(`/photoshoot/${id}`)
          }, 5000)
          return
        }
        setLoading(false)
        setError('Something went wrong. Please check your photoshoots.')
      })
      .catch((err) => {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current)
          redirectTimeoutRef.current = null
        }
        setLoading(false)
        if (err && typeof err === 'object' && 'message' in err && String((err as Error).message).includes('NEXT_REDIRECT')) {
          window.location.href = '/photoshoot'
          return
        }
        const message = err instanceof Error ? err.message : 'Something went wrong'
        if (/failed to fetch|load failed|network error|timeout/i.test(message)) {
          setError('The request took too long. Try fewer photos or try again in a moment.')
        } else {
          setError(message)
        }
        setLoading(false)
      })
  }

  return (
    <div className="w-full flex flex-col lg:flex-row lg:gap-10 xl:gap-12 items-start">
      <div className="w-full lg:w-2/3 shrink-0 min-w-0">
        {loading ? (
          mode === 'single' ? (
            <CreatingPhotoshootSimple />
          ) : (
            <CreatingPhotoshootAnimation totalSteps={parseInt(photoCountForAnimation, 10) || 1} />
          )
        ) : (
          <>
            <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">
              Your premium product photoshoot in seconds
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Upload one photo of your product. Get 4K product photos in 30 seconds. No designer. No logistics.
            </p>

            <form onSubmit={handleSubmit}>
              <OnboardingUpload files={files} onFilesChange={setFiles} />

              {isFirstBrandExperience && (
                <div className="flex flex-wrap gap-2 mt-4 mb-4 justify-center">
                  <span className={BADGE_CLASS}>🎁 5 photos for free</span>
                  <span className={BADGE_CLASS}>💳 No credit card needed</span>
                  <span className={BADGE_CLASS}>✨ No watermark</span>
                </div>
              )}

              {/* 3 cards: Brand Photoshoot, Product Photoshoot, One Photo */}
              {showCardSelector && (
                <div className={`grid grid-cols-1 gap-3 mb-6 ${SHOW_PRODUCT_PHOTOSHOOT ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <label className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="shoot-mode"
                    value="creative"
                    checked={mode === 'creative'}
                    onChange={() => setMode('creative')}
                    className="peer sr-only"
                  />
                  <div className={CARD_BASE}>
                    <span className="inline-flex fill-current text-violet-500 mt-2 mb-2" aria-hidden>
                      🧠
                    </span>
                    <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Brand Photoshoot</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">A complete creative campaign, <br />perfect for socials, ads and website.</div>
                  </div>
                  <div className={CARD_CHECKED_RING} aria-hidden="true" />
                </label>
                {SHOW_PRODUCT_PHOTOSHOOT && (
                <label className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="shoot-mode"
                    value="ultra"
                    checked={mode === 'ultra'}
                    onChange={() => setMode('ultra')}
                    className="peer sr-only"
                  />
                  <div className={CARD_BASE}>
                    <span className="inline-flex fill-current text-violet-500 mt-2 mb-2" aria-hidden>
                      ✨
                    </span>
                    <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Product Photoshoot</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">A complete product photoshoot, <br />perfect for PDPs & website.</div>
                  </div>
                  <div className={CARD_CHECKED_RING} aria-hidden="true" />
                </label>
                )}
                <label className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="shoot-mode"
                    value="single"
                    checked={mode === 'single'}
                    onChange={() => setMode('single')}
                    className="peer sr-only"
                  />
                  <div className={CARD_BASE}>
                    <span className="inline-flex fill-current text-violet-500 mt-2 mb-2" aria-hidden>
                      📸
                    </span>
                    <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">One Photo</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Describe the shot you want and get a single photo, based on your prompt</div>
                  </div>
                  <div className={CARD_CHECKED_RING} aria-hidden="true" />
                </label>
              </div>
              )}

              {/* Brand Photoshoot panel: when no card selector, or when Brand selected */}
              {(!showCardSelector || mode === 'creative') && (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Number of photos
                      </label>
                      <DropdownSelect
                        options={[...CREATIVE_PHOTO_COUNT_OPTIONS]}
                        value={creativePhotoCount}
                        onChange={setCreativePhotoCount}
                        aria-label="Number of photos"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Format</label>
                      <DropdownSelect
                        options={[...FORMAT_OPTIONS]}
                        value={format}
                        onChange={setFormat}
                        aria-label="Format"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quality</label>
                      <DropdownSelect
                        options={[...QUALITY_OPTIONS]}
                        value={quality}
                        onChange={setQuality}
                        aria-label="Quality"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="client-guidelines">
                      Your guidelines <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="client-guidelines"
                      value={clientGuidelines}
                      onChange={(e) => setClientGuidelines(e.target.value)}
                      placeholder="e.g. Must show product in use in at least one shot; avoid cluttered backgrounds; focus on premium, minimal aesthetic; include one close-up texture shot."
                      rows={4}
                      className="form-textarea w-full focus:border-gray-300 dark:focus:border-gray-500 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      aria-label="Client's guidelines for the photoshoot"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Directives for the creative director. Followed when building the strategy and prompts.
                    </p>
                  </div>
                </div>
              )}

              {/* Product Photoshoot panel: same options as Brand (5|9, format, quality, client guidelines) */}
              {showCardSelector && mode === 'ultra' && (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Number of photos
                      </label>
                      <DropdownSelect
                        options={[...PRODUCT_PHOTO_COUNT_OPTIONS]}
                        value={productPhotoCount}
                        onChange={setProductPhotoCount}
                        aria-label="Number of photos"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Format</label>
                      <DropdownSelect
                        options={[...FORMAT_OPTIONS]}
                        value={productFormat}
                        onChange={setProductFormat}
                        aria-label="Format"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quality</label>
                      <DropdownSelect
                        options={[...QUALITY_OPTIONS]}
                        value={quality}
                        onChange={setQuality}
                        aria-label="Quality"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="product-client-guidelines">
                      Your guidelines <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="product-client-guidelines"
                      value={clientGuidelines}
                      onChange={(e) => setClientGuidelines(e.target.value)}
                      placeholder="e.g. Must show product in use in at least one shot; avoid cluttered backgrounds; focus on premium, minimal aesthetic; include one close-up texture shot."
                      rows={4}
                      className="form-textarea w-full focus:border-gray-300 dark:focus:border-gray-500 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      aria-label="Client's guidelines for the photoshoot"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Directives for the creative director. Followed when building the strategy and prompts.
                    </p>
                  </div>
                </div>
              )}

              {showCardSelector && mode === 'single' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="describe-shot">
                      Describe the shot you want
                    </label>
                    <textarea
                      id="describe-shot"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Product on a marble surface with soft shadows, minimalist white background"
                      rows={4}
                      className="form-textarea w-full focus:border-gray-300 dark:focus:border-gray-500 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      aria-label="Describe the shot"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Your description will guide the image generation for this single photo.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Format</label>
                      <DropdownSelect
                        options={[...FORMAT_OPTIONS]}
                        value={format}
                        onChange={setFormat}
                        aria-label="Format"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quality</label>
                      <DropdownSelect
                        options={[...QUALITY_OPTIONS]}
                        value={quality}
                        onChange={setQuality}
                        aria-label="Quality"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4">
                  <Banner02 type="error" open={!!error} setOpen={(open) => !open && setError(null)}>
                    <span>{error}</span>
                    {/credits|insufficient/i.test(error) && (
                      <>
                        {' '}
                        <Link href="/credits" className="underline font-medium hover:no-underline">
                          Get credits
                        </Link>
                      </>
                    )}
                  </Banner02>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    files.length === 0 ||
                    (showCardSelector && mode === 'single' && !customPrompt.trim())
                  }
                  className="btn cursor-pointer w-full justify-center bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                >
                  {loading
                    ? 'Creating your photoshoot…'
                    : showCardSelector && mode === 'single'
                      ? 'Create my photo'
                      : 'Create my photoshoot'}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 mt-6">
                <div className="flex -space-x-3 -ml-0.5">
                  <Image
                    className="rounded-full border-2 border-white dark:border-gray-800 box-content"
                    src={Avatar01}
                    width={28}
                    height={28}
                    alt=""
                  />
                  <Image
                    className="rounded-full border-2 border-white dark:border-gray-800 box-content"
                    src={Avatar02}
                    width={28}
                    height={28}
                    alt=""
                  />
                  <Image
                    className="rounded-full border-2 border-white dark:border-gray-800 box-content"
                    src={Avatar03}
                    width={28}
                    height={28}
                    alt=""
                  />
                  <Image
                    className="rounded-full border-2 border-white dark:border-gray-800 box-content"
                    src={Avatar04}
                    width={28}
                    height={28}
                    alt=""
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">1,337 ads generated this week 🖼️</span>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="w-full lg:w-1/3 mt-8 lg:mt-0 shrink-0 lg:pl-4 lg:pr-4 xl:pr-8 lg:sticky lg:top-24 lg:self-start">
        <ExamplesBlock
          photoCount={photoCountForExamples}
          useCreativeFiveImage={(!showCardSelector || mode === 'creative') && creativePhotoCount === '5'}
          singlePhotoMode={mode === 'single'}
        />
      </div>
    </div>
  )
}
