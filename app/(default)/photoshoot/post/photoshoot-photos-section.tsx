'use client'

import { useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import ModalBasic from '@/components/modal-basic'

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

export type PhotoshootPhotoItem = {
  image: StaticImageData
  alt: string
}

type PhotoshootPhotosSectionProps = {
  photos: PhotoshootPhotoItem[]
  userAvatar?: StaticImageData
  /** Brand name for avatar initial; defaults to "B" when no userAvatar */
  brandName?: string
}

export default function PhotoshootPhotosSection({ photos, userAvatar, brandName }: PhotoshootPhotosSectionProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null

  function openModal(index: number) {
    setSelectedIndex(index)
    setEditModalOpen(true)
  }

  return (
    <>
      <div>
        <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-2">Photos ({photos.length})</h2>
        <div className="grid grid-cols-3 gap-4 my-6">
          {photos.map((photo, index) => (
            <button
              key={index}
              type="button"
              onClick={() => openModal(index)}
              className="group relative block w-full rounded-xs overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              <Image
                className="object-cover object-center w-full h-full transition-transform duration-300 ease-out group-hover:scale-105 min-h-[152px]"
                src={photo.image}
                width={203}
                height={152}
                alt={photo.alt}
              />
            </button>
          ))}
        </div>
      </div>

      <ModalBasic
        isOpen={editModalOpen}
        setIsOpen={setEditModalOpen}
        title="Edit Photo"
      >
        {/* Modal content: photo + chat bar */}
        <div className="px-5 pt-4 pb-5">
          {selectedPhoto && (
            <div className="mb-5">
              <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-video">
                <Image
                  className="object-contain w-full h-full"
                  src={selectedPhoto.image}
                  fill
                  alt={selectedPhoto.alt}
                  sizes="(max-width: 512px) 100vw, 32rem"
                />
              </div>
            </div>
          )}

          {/* Chat bar */}
          <div>
            <label htmlFor="edit-photo-prompt" className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              What do you want to edit?
            </label>
            <div className="flex items-center gap-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0 text-white text-sm font-semibold" aria-hidden>
                {(brandName?.trim() ?? 'B').charAt(0).toUpperCase()}
              </div>
              <input
                id="edit-photo-prompt"
                type="text"
                placeholder="add sunglasses, change the font color, whatever makes sense to you"
                className="flex-1 min-w-0 bg-transparent border-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 text-sm py-1.5"
              />
              <button
                type="button"
                className="shrink-0 p-2 text-gray-700 dark:text-gray-200 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 rounded-lg transition-colors cursor-pointer"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </ModalBasic>
    </>
  )
}
