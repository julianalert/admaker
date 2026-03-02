'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitCampaignFeedback } from './actions'

const StarIcon = ({ filled, className }: { filled: boolean; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill={filled ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className ?? 'size-6'}
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
    />
  </svg>
)

type FeedbackCardProps = {
  campaignId: string
  /** Current rating 1–5 or null */
  initialRating: number | null
}

export default function FeedbackCard({ campaignId, initialRating }: FeedbackCardProps) {
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(initialRating)
  const [hover, setHover] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const displayValue = hover ?? rating

  async function handleSelect(value: number) {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await submitCampaignFeedback(campaignId, value)
      if (result && 'error' in result) {
        return
      }
      setRating(value)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-5 shadow-sm rounded-xl lg:w-[18rem] xl:w-[20rem]">
      <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-3">
        How was this photoshoot?
      </div>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(null)}
        role="group"
        aria-label="Rate this photoshoot 1 to 5 stars"
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = (displayValue ?? 0) >= value
          return (
            <button
              key={value}
              type="button"
              disabled={submitting}
              className={`p-0.5 transition-colors cursor-pointer focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${
                filled
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400'
              } focus:text-amber-500 dark:focus:text-amber-400`}
              onMouseEnter={() => setHover(value)}
              onClick={() => handleSelect(value)}
              aria-label={`${value} star${value !== 1 ? 's' : ''}`}
              aria-pressed={rating === value}
            >
              <StarIcon filled={filled} />
            </button>
          )
        })}
      </div>
      {rating != null && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Thanks for your feedback!
        </p>
      )}
    </div>
  )
}
