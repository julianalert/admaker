'use client'

import { useEffect, useState } from 'react'

const STEP_LABELS_3 = ['Studio Shot', 'Studio Shot #2', 'Contextual Shot']
const STEP_LABELS_5 = ['Studio Shot', 'Studio Shot 2', 'Contextual Shot', 'Lifestyle Shot', 'Creative Shot']
const STEP_LABELS_7 = ['Studio Shot', 'Studio Shot 2', 'Contextual Shot', 'Lifestyle Shot', 'Creative Shot', 'UGC Shot', 'Cinematic Shot']

const TIME_ESTIMATE: Record<number, string> = {
  3: '60–90 seconds',
  5: '1–2 min',
  7: '2–3 min',
}

type CreatingPhotoshootAnimationProps = {
  totalSteps: number
}

export default function CreatingPhotoshootAnimation({ totalSteps }: CreatingPhotoshootAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const labels = totalSteps === 7 ? STEP_LABELS_7 : totalSteps === 5 ? STEP_LABELS_5 : STEP_LABELS_3

  // Advance step every ~7s so progress feels dynamic (server may take 30s–2min)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
    }, 7000)
    return () => clearInterval(interval)
  }, [totalSteps])

  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-violet-50/30 dark:bg-gray-800/50 p-8 sm:p-10">
      <div className="flex flex-col items-center text-center">
            {/* Animated icon */}
            <div className="relative mb-6">
              <div className="h-14 w-14 rounded-full bg-violet-500/20 dark:bg-violet-500/30 flex items-center justify-center animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7 text-violet-600 dark:text-violet-400"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                  />
                </svg>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-5 w-5 rounded-full bg-violet-500" />
              </span>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Creating your photoshoot
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Generating {totalSteps} professional photos. This usually takes {TIME_ESTIMATE[totalSteps] ?? '1–2 min'}.
            </p>

            {/* Progress: current step / total */}
            <div className="w-full max-w-xs mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  Photo {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 dark:bg-violet-500 transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Step list */}
            <ul className="w-full max-w-sm space-y-2 text-left">
              {labels.map((label, i) => (
                <li
                  key={label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    i < currentStep
                      ? 'text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/50'
                      : i === currentStep
                        ? 'text-violet-700 dark:text-violet-300 bg-violet-100/60 dark:bg-violet-900/30 font-medium'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {i < currentStep ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white text-xs">
                      ✓
                    </span>
                  ) : i === currentStep ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-violet-500 bg-violet-500/20">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-600 dark:bg-violet-400" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-400 text-xs">
                      {i + 1}
                    </span>
                  )}
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
  )
}
