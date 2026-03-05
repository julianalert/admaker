import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/signin', '/signup', '/reset-password', '/auth/callback']
const ONBOARDING_PREFIX = '/onboarding'

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  if (pathname.startsWith(ONBOARDING_PREFIX)) return true
  if (pathname === '/api/stripe/webhook') return true
  return false
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === '/new' || pathname === '/onboarding/brand' || /^\/onboarding-\d+/.test(pathname)
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && !isPublicPath(pathname)) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/signin'
    signInUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Only run campaign count when entering the main app/photoshoot area (avoids slowing every route)
  const shouldCheckCampaigns = pathname === '/' || pathname === '/photoshoot'
  if (user && !isOnboardingPath(pathname) && !isPublicPath(pathname)) {
    // Require at least one brand: redirect to first-time onboarding
    const { count: brandCount } = await supabase
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (brandCount !== null && brandCount === 0) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding/brand'
      return NextResponse.redirect(onboardingUrl)
    }
  }
  if (user && shouldCheckCampaigns && !isOnboardingPath(pathname) && !isPublicPath(pathname)) {
    const brandIdFromCookie = request.cookies.get('current_brand_id')?.value
    let count: number | null = null
    if (brandIdFromCookie) {
      const { count: c } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('brand_id', brandIdFromCookie)
      count = c
    } else {
      const { data: firstBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (firstBrand?.id) {
        const { count: c } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('brand_id', firstBrand.id)
        count = c
      } else {
        count = 0
      }
    }
    if (count !== null && count === 0) {
      // Only force "create first campaign" flow when this is the user's first (and only) brand
      const { count: brandCount } = await supabase
        .from('brands')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (brandCount === 1) {
        const onboardingUrl = request.nextUrl.clone()
        onboardingUrl.pathname = '/new'
        return NextResponse.redirect(onboardingUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    {
      // Run middleware on all paths except static assets
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      // Skip middleware for Server Action requests so they get the expected response (avoid "An unexpected response was received from the server" in production)
      missing: [{ type: 'header', key: 'next-action' }],
    },
  ],
}
