'use client'

import { useState } from 'react'
import OnboardingUpload from '../onboarding-upload'
import DropdownSelect from '@/components/dropdown-select'
import { generateTestImage } from './actions'

const TYPE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'studio_2', label: 'Studio 2' },
  { value: 'contextual', label: 'Contextual' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'creative', label: 'Creative' },
  { value: 'ugc_styler', label: 'UGC Styler' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'macro_detail', label: 'Macro Detail' },
  { value: 'social_hook', label: 'Social Hook' },
]

const FORMAT_OPTIONS = [
  { value: '1:1', label: '1:1 (Product Page)' },
  { value: '9:16', label: '9:16 (Story)' },
  { value: '16:9', label: '16:9 (Website)' },
  { value: '4:3', label: '4:3 (Regular visual)' },
  { value: '4:5', label: '4:5 (Portrait)' },
  { value: '5:4', label: '5:4 (Post)' },
]

export default function TestForm() {
  const [files, setFiles] = useState<File[]>([])
  const [type, setType] = useState<string>('studio')
  const [format, setFormat] = useState<string>('9:16')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResultImageUrl(null)
    if (files.length === 0) {
      setError('Please add one product photo.')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', files[0])
      formData.set('type', type)
      formData.set('format', format)
      const result = await generateTestImage(formData)
      if ('error' in result) {
        setError(result.error)
      } else {
        setResultImageUrl(`data:image/png;base64,${result.imageBase64}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-1">Test image generation</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Generate a single image by type. No campaign is created and nothing is saved.
      </p>

      <form onSubmit={handleSubmit}>
        <OnboardingUpload files={files} onFilesChange={setFiles} />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Image type
            </label>
            <DropdownSelect
              options={[...TYPE_OPTIONS]}
              value={type}
              onChange={setType}
              aria-label="Image type"
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

        <button
          type="submit"
          disabled={loading || files.length === 0}
          className="btn w-full justify-center bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {loading && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">This usually takes 30–90 seconds.</p>
      )}

      {resultImageUrl && !loading && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Result</h2>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultImageUrl}
              alt="Generated result"
              className="w-full h-auto block object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
