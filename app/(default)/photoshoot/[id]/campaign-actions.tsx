'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import { deleteCampaign, favoriteAllAds } from './actions'

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 shrink-0 text-red-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" strokeWidth={1.5} stroke="currentColor" className="size-5 shrink-0 text-violet-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
)

type CampaignActionsProps = {
  campaignId: string
  generatedAdUrls: string[]
}

export default function CampaignActions({ campaignId, generatedAdUrls }: CampaignActionsProps) {
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [favoritingAll, setFavoritingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownloadAll() {
    if (generatedAdUrls.length === 0) return
    setDownloading(true)
    setError(null)
    try {
      if (generatedAdUrls.length === 1) {
        const res = await fetch(generatedAdUrls[0], { mode: 'cors' })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'photoshoot-1.png'
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const zip = new JSZip()
        for (let i = 0; i < generatedAdUrls.length; i++) {
          const res = await fetch(generatedAdUrls[i], { mode: 'cors' })
          const blob = await res.blob()
          zip.file(`photoshoot-${i + 1}.png`, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'photoshoot-ads.zip'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  async function handleFavoriteAll() {
    if (generatedAdUrls.length === 0) return
    setFavoritingAll(true)
    setError(null)
    try {
      const result = await favoriteAllAds(campaignId)
      if (result && 'error' in result) {
        setError(result.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to favorite all')
    } finally {
      setFavoritingAll(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this photoshoot and all its images? This cannot be undone.')) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteCampaign(campaignId)
      if (result && 'error' in result) {
        setError(result.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownloadAll}
        disabled={downloading || generatedAdUrls.length === 0}
        className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 cursor-pointer hover:cursor-pointer disabled:cursor-not-allowed"
      >
        <DownloadIcon />
        <span className="ml-2">{downloading ? 'Downloading…' : 'Download all'}</span>
      </button>
      <button
        type="button"
        onClick={handleFavoriteAll}
        disabled={favoritingAll || generatedAdUrls.length === 0}
        className="btn w-full border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-50 cursor-pointer hover:cursor-pointer disabled:cursor-not-allowed"
      >
        <HeartIcon />
        <span className="ml-2">{favoritingAll ? 'Favoriting…' : 'Favorite all'}</span>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="btn w-full border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-50 cursor-pointer hover:cursor-pointer disabled:cursor-not-allowed"
      >
        <TrashIcon />
        <span className="ml-2">{deleting ? 'Deleting…' : 'Delete photoshoot'}</span>
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
