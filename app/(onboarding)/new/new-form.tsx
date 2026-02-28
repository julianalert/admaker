'use client'

import { useState } from 'react'
import Image from 'next/image'
import OnboardingUpload from '../onboarding-upload'
import DropdownSelect from '@/components/dropdown-select'
import { createCampaignWithStudioPhoto } from './actions'
import ExamplesBlock from './examples-block'
import CreatingPhotoshootAnimation from './creating-photoshoot-animation'
import Avatar01 from '@/public/images/avatar-01.jpg'
import Avatar02 from '@/public/images/avatar-02.jpg'
import Avatar03 from '@/public/images/avatar-03.jpg'
import Avatar04 from '@/public/images/avatar-04.jpg'

const PHOTO_COUNT_OPTIONS = [
  { value: '3', label: '3 photos' },
  { value: '5', label: '5 photos' },
  { value: '9', label: '9 photos (Coming soon)', disabled: true },
] as const

const FORMAT_OPTIONS = [
  { value: '1:1', label: '1:1 (Product Page)' },
  { value: '9:16', label: '9:16 (Story)' },
  { value: '16:9', label: '16:9 (Website)' },
  { value: '4:3', label: '4:3 (Regular visual)' },
] as const

const BADGE_CLASS = 'text-xs inline-flex font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-center px-2.5 py-1'

export default function NewForm({ campaignCount = 0 }: { campaignCount?: number }) {
  const [files, setFiles] = useState<File[]>([])
  const [photoCount, setPhotoCount] = useState<string>('5')
  const [format, setFormat] = useState<string>('1:1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (files.length === 0) {
      setError('Please add at least one product photo.')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('photos', f))
      formData.set('photoCount', photoCount)
      formData.set('format', format)
      const result = await createCampaignWithStudioPhoto(formData)
      if (result && 'error' in result) {
        setError(result.error)
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err && String((err as Error).message).includes('NEXT_REDIRECT')) {
        throw err
      }
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col lg:flex-row lg:gap-10 xl:gap-12 items-start">
      {/* Left: headline + form OR loading animation — 2/3 */}
      <div className="w-full lg:w-2/3 shrink-0 lg:sticky lg:top-24 lg:self-start">
        {loading ? (
          <CreatingPhotoshootAnimation totalSteps={parseInt(photoCount, 10) || 5} />
        ) : (
          <>
            <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Your premium product photoshoot in seconds</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Upload one photo of your product. Get 4K product photos in 30 seconds. No designer. No logistics.</p>

            <form onSubmit={handleSubmit}>
          <OnboardingUpload files={files} onFilesChange={setFiles} />
          {campaignCount === 0 && (
            <div className="flex flex-wrap gap-2 mt-4 mb-6 justify-center">
              <span className={BADGE_CLASS}>🎁 5 photos for free</span>
              <span className={BADGE_CLASS}>💳 No credit card needed</span>
              <span className={BADGE_CLASS}>✨ No watermark</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Number of photos
              </label>
              <DropdownSelect
                options={[...PHOTO_COUNT_OPTIONS]}
                value={photoCount}
                onChange={setPhotoCount}
                aria-label="Number of photos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Format
              </label>
              <DropdownSelect
                options={[...FORMAT_OPTIONS]}
                value={format}
                onChange={setFormat}
                aria-label="Format"
              />
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading || files.length === 0}
              className="btn cursor-pointer w-full justify-center bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              {loading ? 'Creating your photoshoot…' : 'Create my photoshoot'}
            </button>
          </div>
          {/* Social proof */}
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              1,337 ads generated this week 🖼️
            </span>
          </div>
        </form>
          </>
        )}
      </div>
      {/* Right: examples — 1/3 */}
      <div className="w-full lg:w-1/3 mt-8 lg:mt-0 lg:sticky lg:top-24 shrink-0 lg:pl-4 lg:pr-4 xl:pr-8">
        <ExamplesBlock photoCount={photoCount} />
      </div>
    </div>
  )
}
