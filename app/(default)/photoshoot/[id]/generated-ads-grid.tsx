'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ModalBasic from '@/components/modal-basic'
import { deleteAd, toggleFavoriteAd, editPhotoWithPrompt } from './actions'

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`size-6 ${filled ? 'fill-violet-500 text-violet-500' : 'fill-none'}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
)

const AnimateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
)

const BufferIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 shrink-0 animate-spin text-violet-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

export type GeneratedAdItem = {
  id: string
  url: string
}

type GeneratedAdsGridProps = {
  campaignId: string
  generatedAds: GeneratedAdItem[]
  favoriteAdIds?: string[]
  /** User avatar URL (e.g. from Google sign-in) for the chat bar */
  userAvatarUrl?: string | null
  /** Brand name for avatar initial when no userAvatarUrl; defaults to "B" */
  brandName?: string
}

export default function GeneratedAdsGrid({ campaignId, generatedAds, favoriteAdIds = [], userAvatarUrl, brandName }: GeneratedAdsGridProps) {
  const router = useRouter()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAd, setSelectedAd] = useState<GeneratedAdItem | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set(favoriteAdIds))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    setFavorites(new Set(favoriteAdIds))
  }, [favoriteAdIds])

  function openModal(ad: GeneratedAdItem) {
    setSelectedAd(ad)
    setEditPrompt('')
    setEditModalOpen(true)
  }

  async function handleSendEdit() {
    if (!selectedAd || !editPrompt.trim() || sending) return
    setSending(true)
    try {
      const result = await editPhotoWithPrompt(campaignId, selectedAd.id, editPrompt.trim())
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setEditPrompt('')
        setEditModalOpen(false)
        router.refresh()
      }
    } finally {
      setSending(false)
    }
  }

  async function handleDownload(e: React.MouseEvent, url: string, index: number) {
    e.stopPropagation()
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `photoshoot-ad-${index + 1}.png`
      a.click()
      URL.revokeObjectURL(u)
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  async function handleDelete(e: React.MouseEvent, adId: string) {
    e.stopPropagation()
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setDeletingId(adId)
    try {
      const result = await deleteAd(adId)
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setEditModalOpen(false)
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, adId: string) {
    e.stopPropagation()
    setTogglingFavoriteId(adId)
    try {
      const result = await toggleFavoriteAd(adId)
      if (result.error) {
        alert(result.error)
      } else {
        setFavorites((prev) => {
          const next = new Set(prev)
          if (result.favorited) next.add(adId)
          else next.delete(adId)
          return next
        })
        router.refresh()
      }
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  if (generatedAds.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 my-6">No generated ads yet.</p>
    )
  }

  return (
    <>
      <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-2">
        Generated ads ({generatedAds.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6 w-full">
        {generatedAds.map((ad, i) => (
          <div
            key={ad.id}
            role="button"
            tabIndex={0}
            onClick={() => openModal(ad)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(ad); } }}
            className="group relative block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none cursor-pointer"
          >
            <Image
              src={ad.url}
              alt={`Generated ad ${i + 1}`}
              width={400}
              height={400}
              className="w-full h-auto block transition-transform duration-300 ease-out group-hover:scale-105 object-cover aspect-square"
              unoptimized
            />
            {/* Hover overlay: top right actions */}
            <div className="absolute top-0 right-0 flex items-center gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-bl-lg">
              <button
                type="button"
                onClick={(e) => handleDownload(e, ad.url, i)}
                className="p-2 text-white hover:bg-white/20 rounded-lg cursor-pointer"
                aria-label="Download"
              >
                <DownloadIcon />
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(e, ad.id)}
                disabled={deletingId === ad.id}
                className="p-2 text-white hover:bg-white/20 rounded-lg cursor-pointer disabled:opacity-50"
                aria-label="Delete"
              >
                <TrashIcon />
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleFavorite(e, ad.id)}
                disabled={togglingFavoriteId === ad.id}
                className="p-2 text-white hover:bg-white/20 rounded-lg cursor-pointer disabled:opacity-50"
                aria-label={favorites.has(ad.id) ? 'Unfavorite' : 'Favorite'}
              >
                <HeartIcon filled={favorites.has(ad.id)} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalBasic
        isOpen={editModalOpen}
        setIsOpen={setEditModalOpen}
        title="Edit Photo"
      >
        <div className="px-5 pt-4 pb-5">
          {selectedAd && (
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="p-2 border border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70 inline-flex items-center rounded-lg"
                >
                  <AnimateIcon />
                  <span className="ml-2">Animate</span>
                  <span className="ml-1.5 text-xs italic">(Coming soon)</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedAd.url, Math.max(0, generatedAds.findIndex((a) => a.id === selectedAd.id)))}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors cursor-pointer"
                    aria-label="Download"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, selectedAd.id)}
                    disabled={togglingFavoriteId === selectedAd.id}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={favorites.has(selectedAd.id) ? 'Unfavorite' : 'Favorite'}
                  >
                    <HeartIcon filled={favorites.has(selectedAd.id)} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, selectedAd.id)}
                    disabled={deletingId === selectedAd.id}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
              <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-video">
                <Image
                  src={selectedAd.url}
                  alt="Edit"
                  fill
                  className="object-contain w-full h-full"
                  sizes="(max-width: 512px) 100vw, 32rem"
                  unoptimized
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="edit-photo-prompt-detail" className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              What do you want to edit?
            </label>
            <div className="flex items-center gap-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full shrink-0 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0 text-white text-sm font-semibold" aria-hidden>
                  {(brandName?.trim() ?? 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <input
                id="edit-photo-prompt-detail"
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendEdit(); } }}
                placeholder="make the product smaller, make the scene night time, etc."
                className="flex-1 min-w-0 bg-transparent border-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 text-sm py-1.5"
              />
              <button
                type="button"
                onClick={handleSendEdit}
                disabled={sending || !editPrompt.trim()}
                className="shrink-0 p-2 text-gray-700 dark:text-gray-200 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                aria-label="Send"
              >
                {sending ? (
                  <>
                    <BufferIcon />
                    <span className="text-xs">Generating…</span>
                  </>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>
          </div>
        </div>
      </ModalBasic>
    </>
  )
}
