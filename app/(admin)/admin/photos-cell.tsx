'use client'

import { useState } from 'react'
import Image from 'next/image'

type PhotosCellProps = {
  photoUrls: string[]
  campaignId: string
}

export default function PhotosCell({ photoUrls, campaignId }: PhotosCellProps) {
  const [expanded, setExpanded] = useState(false)
  const count = photoUrls.length

  if (count === 0) {
    return <span className="text-gray-400 text-sm">—</span>
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {count} photo{count !== 1 ? 's' : ''}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-3 gap-2 max-w-xs">
          {photoUrls.map((url, i) => (
            <div
              key={`${campaignId}-photo-${i}`}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
            >
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="100px"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
