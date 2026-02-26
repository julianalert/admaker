'use client'

import { useCallback, useState } from 'react'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_FILES = 10

type OnboardingUploadProps = {
  /** When provided, component is controlled (for use in forms that submit programmatically). */
  files?: File[]
  onFilesChange?: (files: File[]) => void
}

export default function OnboardingUpload({ files: controlledFiles, onFilesChange }: OnboardingUploadProps = {}) {
  const [internalFiles, setInternalFiles] = useState<File[]>([])
  const isControlled = controlledFiles != null && onFilesChange != null
  const files = isControlled ? controlledFiles : internalFiles
  const setFiles = useCallback(
    (next: File[] | ((prev: File[]) => File[])) => {
      if (isControlled) {
        onFilesChange!(typeof next === 'function' ? next(controlledFiles) : next)
      } else {
        setInternalFiles(typeof next === 'function' ? next(internalFiles) : next)
      }
    },
    [isControlled, controlledFiles, onFilesChange, internalFiles]
  )
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      const next = Array.from(list).filter((f) => f.type.startsWith('image/'))
      setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES))
    },
    [setFiles]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index))
    },
    [setFiles]
  )

  return (
    <div className="space-y-3 mb-8">
      <label className="block">
        <span className="sr-only">Upload product photos</span>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative rounded-xl border-2 border-dashed p-8 text-center transition
            ${isDragging
              ? 'border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-900/10'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-800/70'
            }
          `}
        >
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden
          >
            <path
              d="M24 32v-16M24 32l-6-6M24 32l6-6M8 28v4a4 4 0 004 4h24a4 4 0 004-4v-4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 20v-8a4 4 0 00-4-4h-4M8 20v-8a4 4 0 014-4h4"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Drag and drop your product photo here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG or WebP.
          </p>
        </div>
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 px-3 py-2 text-sm"
            >
              <span className="truncate text-gray-800 dark:text-gray-200">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={`Remove ${file.name}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
