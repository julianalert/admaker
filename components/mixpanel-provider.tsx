'use client'

import { useEffect } from 'react'
import mixpanel from 'mixpanel-browser'
import { createClient } from '@/lib/supabase/client'

export default function MixpanelProvider() {
  useEffect(() => {
    mixpanel.init('a57fd33001269c679b909f70bc479996', {
      autocapture: false,
      record_sessions_percent: 100,
      api_host: 'https://api-eu.mixpanel.com',
    })

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user
      if (!user) return

      // Identify the user so all subsequent events are attributed to them
      mixpanel.identify(user.id)
      mixpanel.people.set({
        $email: user.email,
        $name: user.user_metadata?.full_name ?? undefined,
        $avatar: user.user_metadata?.avatar_url ?? undefined,
        $created: user.created_at,
      })

      // Auth events are signaled by the callback route via ?mx_event=...
      const params = new URLSearchParams(window.location.search)
      const mxEvent = params.get('mx_event')

      if (mxEvent === 'SignedUp') {
        mixpanel.track('SignedUp', {
          provider: 'google',
          email: user.email,
          name: user.user_metadata?.full_name ?? undefined,
        })
      } else if (mxEvent === 'LoggedIn') {
        mixpanel.track('LoggedIn', {
          provider: 'google',
          email: user.email,
        })
      }

      // Clean up the mx_event param from the URL without causing a navigation
      if (mxEvent) {
        params.delete('mx_event')
        const newSearch = params.toString()
        window.history.replaceState(
          {},
          '',
          window.location.pathname + (newSearch ? `?${newSearch}` : '')
        )
      }
    })
  }, [])

  return null
}
