'use client'

import { useState } from 'react'
import OnboardingUpload from '../onboarding-upload'
import DropdownSelect from '@/components/dropdown-select'
import { createCampaignWithStudioPhoto } from './actions'

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

export default function NewForm() {
  const [files, setFiles] = useState<File[]>([])
  const [photoCount, setPhotoCount] = useState<string>('3')
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
    <form onSubmit={handleSubmit}>
      <OnboardingUpload files={files} onFilesChange={setFiles} />
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
          {loading ? 'Creating your ad…' : 'Create my ads'}
        </button>
      </div>
    </form>
  )
}
