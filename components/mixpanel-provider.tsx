'use client'

import { useEffect } from 'react'
import mixpanel from 'mixpanel-browser'

export default function MixpanelProvider() {
  useEffect(() => {
    mixpanel.init('a57fd33001269c679b909f70bc479996', {
      autocapture: true,
      record_sessions_percent: 100,
      api_host: 'https://api-eu.mixpanel.com',
    })
  }, [])

  return null
}
