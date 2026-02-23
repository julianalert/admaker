'use server'

import { createClient } from '@/lib/supabase/server'

export async function getGoogleAuthUrl(callbackUrl: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl },
  })
  if (error) throw error
  if (!data?.url) throw new Error('No auth URL')
  return data.url
}
