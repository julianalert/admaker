'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsSidebar() {
  const pathname = usePathname()
    
  return (
    <div className="flex flex-nowrap overflow-x-scroll no-scrollbar md:block md:overflow-auto px-3 py-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/60 min-w-[15rem] md:space-y-3">
      <div>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">Business settings</div>
        <ul className="flex flex-nowrap md:block mr-3 md:mr-0">
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link href="/settings/account" className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${pathname.includes('/settings/account') && 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'}`}>
              <svg className={`shrink-0 fill-current mr-2 ${pathname.includes('/settings/account') ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`} width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5.143 7.91a1 1 0 1 1-1.714-1.033A7.996 7.996 0 0 1 8 10a7.996 7.996 0 0 1 6.857 3.877 1 1 0 1 1-1.714 1.032A5.996 5.996 0 0 0 8 12a5.996 5.996 0 0 0-5.143 2.91Z" />
              </svg>
              <span className={`text-sm font-medium ${pathname.includes('/settings/account') ? 'text-violet-500 dark:text-violet-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'}`}>My Account</span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link href="/settings/credits" className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${pathname.includes('/settings/credits') && 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'}`}>
              <svg className={`shrink-0 fill-current mr-2 ${pathname.includes('/settings/credits') ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`} width="16" height="16" viewBox="0 0 16 16">
                <path d="M5 9a1 1 0 1 1 0-2h6a1 1 0 0 1 0 2H5ZM1 4a1 1 0 1 1 0-2h14a1 1 0 0 1 0 2H1Zm0 10a1 1 0 0 1 0-2h14a1 1 0 0 1 0 2H1Z" />
              </svg>
              <span className={`text-sm font-medium ${pathname.includes('/settings/credits') ? 'text-violet-500 dark:text-violet-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'}`}>Credits</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
