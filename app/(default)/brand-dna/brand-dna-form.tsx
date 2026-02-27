'use client'

import { useState } from 'react'
import { generateBrandDna } from './actions'

type Props = {
  /** When true, hide the page title and use smaller spacing (e.g. inside "Regenerate" section) */
  compact?: boolean
}

export default function BrandDnaForm({ compact }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await generateBrandDna(url)
      if ('error' in result) {
        setError(result.error)
        return
      }
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={compact ? 'w-full' : 'w-full max-w-xl'}>
      {!compact && (
        <>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Brand DNA</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Enter your website URL. We&apos;ll analyze it and build a complete Brand DNA profile including audience, messaging, objections, and more.
          </p>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor={compact ? 'website-url-compact' : 'website-url'} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Your website URL
        </label>
        <input
          id={compact ? 'website-url-compact' : 'website-url'}
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
          {loading ? 'Analyzing your website…' : compact ? 'Regenerate Brand DNA' : 'Build Brand DNA'}
        </button>
      </form>
    </div>
  )
}
