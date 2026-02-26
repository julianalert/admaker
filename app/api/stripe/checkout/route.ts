import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getPack } from '@/lib/stripe/credit-packs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

    const origin = request.headers.get('origin') || request.url.replace(/\/api\/stripe\/checkout.*/, '')
    const successUrl = `${origin}/settings/credits?success=1`
    const cancelUrl = `${origin}/settings/credits`

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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
