'use client'

function BufferIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-5 shrink-0 animate-spin text-violet-500"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  )
}

/**
 * Simple "creating" state matching the photoshoot detail page:
 * "Your photoshoot is being created" + "Photos are being generated. This usually takes 1–2 minutes..."
 * Used when creating a single photo (no step-by-step progress).
 */
export default function CreatingPhotoshootSimple() {
  return (
    <div className="w-full rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/50 dark:bg-violet-900/20 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/20 dark:bg-violet-500/30">
          <BufferIcon />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Your photoshoot is being created
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your photo is being generated. This usually takes 1–2 minutes. The page will update when ready.
          </p>
        </div>
      </div>
    </div>
  )
}
