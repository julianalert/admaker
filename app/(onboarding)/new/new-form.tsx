'use client'

import { useState } from 'react'
import OnboardingUpload from '../onboarding-upload'
import { createCampaignWithStudioPhoto } from './actions'

export default function NewForm() {
  const [files, setFiles] = useState<File[]>([])
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
      const result = await createCampaignWithStudioPhoto(formData)
      if (result && 'error' in result) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <OnboardingUpload files={files} onFilesChange={setFiles} />
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
