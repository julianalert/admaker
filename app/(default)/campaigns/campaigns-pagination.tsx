import Link from 'next/link'

type CampaignsPaginationProps = {
  currentPage: number
  totalPages: number
}

function buildPageHref(page: number): string {
  if (page <= 1) return '/campaigns'
  return `/campaigns?page=${page}`
}

export default function CampaignsPagination({ currentPage, totalPages }: CampaignsPaginationProps) {
  if (totalPages <= 1) return null

  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages
  const prevHref = buildPageHref(currentPage - 1)
  const nextHref = buildPageHref(currentPage + 1)

  const pageNumbers: number[] = []
  const showPages = 5
  let start = Math.max(1, currentPage - Math.floor(showPages / 2))
  const end = Math.min(totalPages, start + showPages - 1)
  if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1)
  for (let i = start; i <= end; i++) pageNumbers.push(i)

  return (
    <div className="flex justify-center">
      <nav className="flex items-center gap-1" role="navigation" aria-label="Campaigns pagination">
        {/* Previous */}
        <div>
          {hasPrev ? (
            <Link
              href={prevHref}
              className="inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-violet-500 shadow-sm"
              aria-label="Previous page"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                <path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z" />
              </svg>
            </Link>
          ) : (
            <span
              className="inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-300 dark:text-gray-600 cursor-default"
              aria-hidden
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                <path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z" />
              </svg>
            </span>
          )}
        </div>

        {/* Page numbers - first item rounded-l-lg, last item rounded-r-lg */}
        <ul className="inline-flex text-sm font-medium -space-x-px rounded-lg shadow-sm [&>li:first-child>*]:rounded-l-lg [&>li:last-child>*]:rounded-r-lg">
          {start > 1 && (
            <li>
              <Link
                className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300"
                href={buildPageHref(1)}
              >
                1
              </Link>
            </li>
          )}
          {start > 2 && (
            <li>
              <span className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500">
                …
              </span>
            </li>
          )}
          {pageNumbers.map((n) => (
            <li key={n}>
              {n === currentPage ? (
                <span
                  className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-violet-500"
                  aria-current="page"
                >
                  {n}
                </span>
              ) : (
                <Link
                  className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300"
                  href={buildPageHref(n)}
                >
                  {n}
                </Link>
              )}
            </li>
          ))}
          {end < totalPages - 1 && (
            <li>
              <span className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500">
                …
              </span>
            </li>
          )}
          {end < totalPages && (
            <li>
              <Link
                className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300"
                href={buildPageHref(totalPages)}
              >
                {totalPages}
              </Link>
            </li>
          )}
        </ul>

        {/* Next */}
        <div>
          {hasNext ? (
            <Link
              href={nextHref}
              className="inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-violet-500 shadow-sm"
              aria-label="Next page"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
              </svg>
            </Link>
          ) : (
            <span
              className="inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-300 dark:text-gray-600 cursor-default"
              aria-hidden
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
              </svg>
            </span>
          )}
        </div>
      </nav>
    </div>
  )
}
