import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

function getRequestCookies(request: Request): { name: string; value: string }[] {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return []
  return cookieHeader.split('; ').map((c) => {
    const eq = c.indexOf('=')
    const name = eq === -1 ? c.trim() : c.slice(0, eq).trim()
    const value = eq === -1 ? '' : c.slice(eq + 1).trim()
    return { name, value }
  }).filter((c) => c.name)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=no_code`)
  }

  const redirectUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getRequestCookies(request)
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_error`)
  }

  return response
}
