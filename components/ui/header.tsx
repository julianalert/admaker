'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAppProvider } from '@/app/app-provider'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// import SearchModal from '@/components/search-modal'
// import Notifications from '@/components/dropdown-notifications'
// import DropdownHelp from '@/components/dropdown-help'
import ThemeToggle from '@/components/theme-toggle'
import DropdownProfile from '@/components/dropdown-profile'

export default function Header({
  variant = 'default',
}: {
  variant?: 'default' | 'v2' | 'v3'
}) {

  const { sidebarOpen, setSidebarOpen } = useAppProvider()
  const [credits, setCredits] = useState<number | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const loadCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single()
        setCredits(profile?.credits ?? 0)
      } else {
        setCredits(null)
      }
    }
    loadCredits()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setCredits(data?.credits ?? 0))
      } else {
        setCredits(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className={`sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md max-lg:before:bg-white/90 dark:max-lg:before:bg-gray-800/90 before:-z-10 z-30 ${variant === 'v2' || variant === 'v3' ? 'before:bg-white after:absolute after:h-px after:inset-x-0 after:top-full after:bg-gray-200 dark:after:bg-gray-700/60 after:-z-10' : 'max-lg:shadow-sm lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90'} ${variant === 'v2' ? 'dark:before:bg-gray-800' : ''} ${variant === 'v3' ? 'dark:before:bg-gray-900' : ''}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-16 ${variant === 'v2' || variant === 'v3' ? '' : 'lg:border-b border-gray-200 dark:border-gray-700/60'}`}>

          {/* Header: Left side */}
          <div className="flex">

            {/* Hamburger button */}
            <button
              className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => { setSidebarOpen(!sidebarOpen) }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>

          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            {/* Loop icon (search) - hidden via comment
            <div>
              <button
                className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full ml-3 ${searchModalOpen && 'bg-gray-200 dark:bg-gray-800'}`}
                onClick={() => { setSearchModalOpen(true) }}
              >
                <span className="sr-only">Search</span>
                <svg
                  className="fill-current text-gray-500/80 dark:text-gray-400/80"
                  width={16}
                  height={16}
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z" />
                  <path d="m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z" />
                </svg>
              </button>
              <SearchModal isOpen={searchModalOpen} setIsOpen={setSearchModalOpen} />
            </div>
            */}
            {/* Chat icon (notifications) - hidden via comment
            <Notifications align="right" />
            */}
            {/* i icon (help) - hidden via comment
            <DropdownHelp align="right" />
            */}
            {credits !== null && credits > 0 && (
              <Link
                href="/settings/credits"
                className="inline-flex items-center text-sm font-medium bg-gray-900/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200 rounded-full text-center px-2 py-0.5 hover:opacity-90 transition-opacity"
              >
                <svg className="w-3 h-3 shrink-0 fill-current text-yellow-500 mr-1" viewBox="0 0 12 12">
                  <path d="M11.953 4.29a.5.5 0 00-.454-.292H6.14L6.984.62A.5.5 0 006.12.173l-6 7a.5.5 0 00.379.825h5.359l-.844 3.38a.5.5 0 00.864.445l6-7a.5.5 0 00.075-.534z" />
                </svg>
                <span>{credits} credit{credits !== 1 ? 's' : ''} left</span>
              </Link>
            )}
            {credits !== null && credits === 0 && (
              <Link
                href="/settings/credits"
                className="inline-flex items-center min-w-0 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg px-3 py-1.5 transition-colors"
              >
                <svg className="shrink-0 fill-current opacity-80 mt-[1px] mr-2" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                </svg>
                <span>0 credits left, buy now</span>
              </Link>
            )}
            <ThemeToggle />
            {/*  Divider */}
            <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />
            <DropdownProfile align="right" />

          </div>

        </div>
      </div>
    </header>
  )
}
