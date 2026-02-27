import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getPack } from '@/lib/stripe/credit-packs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/** Base URL for checkout redirects. Uses NEXT_PUBLIC_APP_URL, or allowlisted dev origins. */
function getCheckoutBaseUrl(request: Request): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const origin = request.headers.get('origin')
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const packId = body?.pack as string
    const pack = getPack(packId)
    if (!pack) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = getCheckoutBaseUrl(request)
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Invalid request. Set NEXT_PUBLIC_APP_URL in production.' },
        { status: 400 }
      )
    }
    const successUrl = `${baseUrl}/settings/credits?success=1`
    const cancelUrl = `${baseUrl}/settings/credits`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pack.amountCents,
            product_data: {
              name: `${pack.credits} credits`,
              description: `${pack.credits} AI product photos.`,
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: { credits: String(pack.credits) },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
