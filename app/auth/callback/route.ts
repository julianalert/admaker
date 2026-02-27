import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Returns a safe path for redirect (same-origin only), or null if invalid. */
function getSafeRedirectPath(value: string): string | null {
  const path = value.trim()
  if (path === '' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return null
  }
  try {
    const resolved = new URL(path, 'https://same-origin.example.com')
    if (resolved.origin !== 'https://same-origin.example.com') return null
    return resolved.pathname + resolved.search
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextRaw = requestUrl.searchParams.get('next') ?? '/'

  // Prevent open redirect: allow only same-origin paths (e.g. / or /photoshoot/123)
  const safeNext = getSafeRedirectPath(nextRaw)
  const next = safeNext ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { path: '/', ...options })
              )
            } catch {
              // ignore
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/signin?error=auth_callback_error', requestUrl.origin))
}
