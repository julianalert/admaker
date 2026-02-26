# Local Stripe webhook testing

When testing on **localhost**, Stripe’s servers cannot reach your machine. Use the Stripe CLI to forward events to your app.

## 1. Install and log in (one-time)

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

## 2. Start your app and the CLI

**Terminal A** – your app:

```bash
npm run dev
```

**Terminal B** – webhook forwarding (leave it running):

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

The CLI will print something like:

```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxx
```

## 3. Use the CLI secret in `.env.local`

Copy the `whsec_...` value and set:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

Restart `npm run dev` (Terminal A) so it loads the new env.

## 4. Do a test payment

1. Open http://localhost:3000/settings/credits  
2. Click **Buy** on any pack and complete checkout (use card `4242 4242 4242 4242` in test mode).  
3. Watch **both** terminals:
   - **Terminal B (stripe listen)** should show the event and something like `[200] POST http://localhost:3000/api/stripe/webhook`.
   - **Terminal A (npm run dev)** should show logs like:
     - `[Stripe webhook] POST received`
     - `[Stripe webhook] Event type: checkout.session.completed`
     - `[Stripe webhook] Credits added: ...`

If you see **no** `[Stripe webhook]` lines in Terminal A, the request is not reaching your app (wrong URL, or `stripe listen` not running / not forwarding).  
If you see **Signature verification failed**, `STRIPE_WEBHOOK_SECRET` is wrong or not the one from `stripe listen`.  
If you see **add_credits failed**, check `SUPABASE_SERVICE_ROLE_KEY` and that the migration for `add_credits` has been applied.
