import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with service role key.
 * Use only in API routes (e.g. webhook) to call RPCs that are restricted to service_role (e.g. add_credits).
 * Never expose this client or the service role key to the browser.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key)
}
