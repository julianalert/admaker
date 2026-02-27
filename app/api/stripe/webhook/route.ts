import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  console.log('[Stripe webhook] POST received')
  if (!webhookSecret) {
    console.error('[Stripe webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    console.error('[Stripe webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Stripe webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  console.log('[Stripe webhook] Event type:', event.type)
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id
  const creditsStr = session.metadata?.credits

  if (!userId || !creditsStr) {
    console.error('[Stripe webhook] Missing client_reference_id or metadata.credits', { session_id: session.id })
    return NextResponse.json({ error: 'Invalid session data' }, { status: 400 })
  }

  const credits = parseInt(creditsStr, 10)
  if (!Number.isInteger(credits) || credits < 1) {
    console.error('[Stripe webhook] Invalid metadata.credits', { credits: creditsStr })
    return NextResponse.json({ error: 'Invalid credits' }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: credits,
    })
    if (error) {
      console.error('[Stripe webhook] add_credits failed:', error)
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
    }
    // Log without PII: session_id and credits only (do not log user_id)
    console.log('[Stripe webhook] Credits added:', { session_id: session.id, credits })
  } catch (err) {
    console.error('[Stripe webhook] Fulfillment error:', err)
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
