'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import AccountImage from '@/public/images/user-avatar-80.png'

export default function AccountPanel() {

  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const loadUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', currentUser.id)
          .single()
        setCredits(profile?.credits ?? 0)
      } else {
        setCredits(null)
      }
    }
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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

  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? ''
  const email = user?.email ?? ''

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">My Account</h2>
        {/* Picture, name and email */}
        <section>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              {avatarUrl ? (
                avatarUrl.includes('lh3.googleusercontent.com') ? (
                  <Image
                    className="w-20 h-20 rounded-full object-cover"
                    src={avatarUrl}
                    width={80}
                    height={80}
                    alt="Profile"
                  />
                ) : (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                    width={80}
                    height={80}
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <Image className="w-20 h-20 rounded-full" src={AccountImage} width={80} height={80} alt="Profile" />
              )}
            </div>
            <div className="min-w-0">
              {displayName && (
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{displayName}</div>
              )}
              {email && (
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</div>
              )}
            </div>
          </div>
        </section>
        {/* Credits */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Credits</h2>
          <div className="text-sm">
            {credits !== null ? `You have ${credits} credit${credits !== 1 ? 's' : ''} left.` : '—'}
          </div>
          <Link href="/settings/credits" className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white mt-2 cursor-pointer inline-flex">
            Buy credits
          </Link>
        </section>
      </div>
    </div>
  )
}
