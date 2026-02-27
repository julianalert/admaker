# Security Audit & Action Plan — Admaker

**Date:** 2025-02-27  
**Scope:** Full application (auth, API routes, server actions, Supabase, Stripe, file uploads, Brand DNA, middleware)  
**Status:** Audit only — no changes applied.

---

## Executive summary

The app has a solid base: Supabase RLS, service-role isolation for credits, Stripe webhook verification, and server-side auth checks. Several issues should be fixed (open redirect, checkout URL trust, URL/SSRF and file validation, logging, and hardening). The list below is ordered by severity, then by category.

---

## 1. Critical & high

### 1.1 Open redirect in auth callback (High)

**Location:** `app/auth/callback/route.ts`

**Issue:** The `next` query parameter is used in `NextResponse.redirect(new URL(next, requestUrl.origin))` without validation. If `next` is `//evil.com` or `//evil.com/path`, `new URL(next, requestUrl.origin)` resolves to `https://evil.com/...`, so users can be redirected off-site after sign-in.

**Attack example:** User visits `https://yourapp.com/signin?next=//evil.com`. Depending on OAuth flow and whether `next` is passed through to the callback, post-login redirect could go to `https://evil.com`.

**Action:**

- Allow only same-origin paths: require `next` to be a path (e.g. `next.startsWith('/') && !next.startsWith('//')`), or parse with `new URL(next, requestUrl.origin)` and enforce `url.origin === requestUrl.origin` and `url.pathname` starts with `/`.
- Optionally use an allowlist of path prefixes (e.g. `/`, `/photoshoot`, `/settings`) instead of any path.

---

### 1.2 Stripe checkout success/cancel URL from `Origin` (High)

**Location:** `app/api/stripe/checkout/route.ts`

**Issue:** `successUrl` and `cancelUrl` are built from `request.headers.get('origin')`. For normal browser requests the browser sets `Origin` and it cannot be spoofed by page JS, but server-side or scripted requests (e.g. curl, Postman, or a server making the request) can set any `Origin`. After payment, “Return to merchant” could then send the user to an attacker’s domain.

**Action:**

- Prefer a fixed base URL from env, e.g. `process.env.NEXT_PUBLIC_APP_URL` (with fallback for dev), and build:
  - `successUrl = `${baseUrl}/settings/credits?success=1``
  - `cancelUrl = `${baseUrl}/settings/credits``
- If you must use `Origin`, restrict to an allowlist of known app origins (e.g. production + staging + localhost) and reject others with 400.

---

### 1.3 Brand DNA: URL validation and SSRF (High)

**Location:** `app/(default)/brand-dna/actions.ts`

**Issue:** User-controlled `websiteUrl` is sent to ScrapingBee. There is no validation that the URL is public (e.g. no `localhost`, 127.0.0.1, 10.x, 169.254.x, internal hostnames). This can enable SSRF (scanning internal network, hitting cloud metadata endpoints, or abusing ScrapingBee to hit internal services).

**Action:**

- Parse the normalized URL and reject non-`http`/`https` schemes.
- Resolve hostname and reject private/internal IPs (IPv4 private ranges, link-local, loopback; IPv6 loopback/link-local/ULA if applicable). Optionally block by hostname allowlist or blocklist.
- Consider a max URL length and rate limiting per user for this action.

---

## 2. Medium

### 2.1 File upload: type and size (Medium)

**Location:** `app/(onboarding)/new/actions.ts` — `createCampaignWithStudioPhoto`

**Issue:**

- MIME type is taken from `firstPhoto.type` (client-controlled). A malicious client could send a non-image file with `type: 'image/jpeg'`.
- No server-side check that the file is actually an image (e.g. magic bytes / content sniffing).
- Server Actions `bodySizeLimit` is 5MB in `next.config.js`, which is good, but there is no per-file or per-request limit documented or enforced in the action itself.

**Action:**

- Validate file content (magic bytes) for allowed image types (e.g. JPEG, PNG, WebP) and reject others.
- Optionally enforce a max size per file (e.g. 4MB) in the action.
- Keep using client-reported MIME only for hint; final decision should be server-side content-based.

---

### 2.2 Sensitive data in error responses (Medium)

**Location:** Various server actions and API routes.

**Issue:** Some error responses may expose internal details, e.g.:

- `app/(default)/brand-dna/actions.ts`: `OpenAI error: ${chatRes.status} ${errBody.slice(0, 300)}` and `Could not fetch website: ${res.status} ${text.slice(0, 200)}` — can leak API or scraping responses.
- `app/api/stripe/checkout/route.ts`: `err instanceof Error ? err.message : 'Checkout failed'` — Stripe errors can include sensitive strings.

**Action:**

- In production, return generic messages to the client (e.g. “Analysis failed”, “Checkout failed”) and log full details server-side only.
- Avoid forwarding third-party (OpenAI, ScrapingBee, Stripe) response bodies or error messages to the client.

---

### 2.3 `dangerouslySetInnerHTML` with message content (Medium / Low depending on data source)

**Location:** `app/(double-sidebar)/inbox/mail-item.tsx`

**Issue:** `mail.message` is rendered with `dangerouslySetInnerHTML`. Currently the inbox uses hardcoded demo data, so risk is low. If `mail` ever comes from the DB or an API (user-generated or external), this becomes an XSS vector.

**Action:**

- If this stays demo-only: add a short comment that `message` must remain static.
- If you ever load messages from DB/API: sanitize HTML (e.g. DOMPurify) or render as plain text / safe markdown only.

---

### 2.4 Logging (Medium)

**Location:** `app/api/stripe/webhook/route.ts` (and similar)

**Issue:** `console.log('[Stripe webhook] Credits added:', { session_id, user_id, credits })` — logging `user_id` (and possibly other identifiers) can help an attacker with reconnaissance or compliance issues if logs are exposed.

**Action:**

- Avoid logging PII (user IDs, emails, etc.) in production, or redact (e.g. last 4 chars of ID).
- Prefer structured logging with levels and ensure production log aggregation does not expose these to unauthorized parties.

---

## 3. Lower priority / hardening

### 3.1 Auth callback: `code` and error path

**Location:** `app/auth/callback/route.ts`

**Issue:** If `code` is missing, the handler falls through and redirects to `/signin?error=auth_callback_error` without clearing any stale session. Minor: no explicit short-circuit when `next` is invalid (will be addressed by 1.1).

**Action:**

- After implementing safe `next` validation (1.1), use the validated path for success redirect; on validation failure redirect to `/signin?error=...` or `/` without using `next`.
- Optionally ensure error redirect always uses a single, known origin (already the case with `requestUrl.origin`).

---

### 3.2 Middleware: missing env

**Location:** `middleware.ts`

**Issue:** When `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, middleware does `NextResponse.next({ request })`, so all routes are accessible without auth.

**Action:**

- In production, fail closed: if required env vars are missing, return 503 or redirect to a “maintenance” page and log the error.

---

### 3.3 API route `/api/hello`

**Location:** `app/api/hello/route.ts`

**Issue:** Public GET endpoint with no auth. Low risk (no sensitive data), but it exposes framework/stack.

**Action:**

- Remove if unused, or protect behind auth / rate limit if you want to avoid unnecessary surface.

---

### 3.4 Rate limiting

**Issue:** No application-level rate limiting on login, server actions (campaign creation, Brand DNA), or API routes (checkout, webhook is authenticated by Stripe).

**Action:**

- Add rate limiting for: sign-in attempts, Brand DNA generation, campaign creation, and optionally Stripe checkout (e.g. per-IP or per-user). Use middleware, Vercel/edge config, or external service (e.g. Upstash).

---

### 3.5 Security headers

**Issue:** No explicit security headers (CSP, X-Frame-Options, etc.) were found in the codebase.

**Action:**

- Add headers in `next.config.js` or middleware, e.g.:
  - `X-Frame-Options: DENY` or `SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin` (or stricter)
  - Content-Security-Policy (tune to your scripts/styles and Supabase/Stripe/Google domains)

---

### 3.6 Dependency and supply chain

**Action:**

- Run `npm audit` and fix high/critical issues.
- Pin dependency versions and periodically update; consider Dependabot or Renovate.
- Prefer minimal dependencies for security-sensitive operations.

---

## 4. What’s in good shape

- **Supabase RLS:** Tables (`profiles`, `campaigns`, `campaign_photos`, `ads`, `brand_dna`) have RLS with `auth.uid()` and ownership checks. Storage policies are scoped by `auth.uid()` in path.
- **Credits RPC:**
  - `add_credits`: only `service_role`; used by webhook. Properly restricted.
  - `consume_credits` / `refund_credits`: enforce `p_user_id = auth.uid()`; no need for extra REVOKE if only authenticated users call them (default grants are acceptable with this check).
- **Stripe webhook:** Uses raw body and `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)`; no double consumption of body. Webhook secret is server-only.
- **Service role:** Used only in webhook route and only for `add_credits`; not exposed to client.
- **Stripe checkout:** User is taken from Supabase auth; `client_reference_id` and metadata are server-set. Pack IDs are validated against `CREDIT_PACKS` allowlist.
- **Server actions:** Campaign create/delete and Brand DNA check `supabase.auth.getUser()` and use user id for ownership/RLS.
- **Env:** `.env*.local` and `.env` in `.gitignore`. No secrets in `NEXT_PUBLIC_*` except Supabase URL and anon key (intended).
- **Images:** `next.config.js` restricts `remotePatterns` to Google and Supabase hostnames.

---

## 5. Action plan summary

| Priority | Item | Location | Action |
|----------|------|----------|--------|
| High | Open redirect | `app/auth/callback/route.ts` | Validate `next`: path-only, same-origin |
| High | Checkout URLs | `app/api/stripe/checkout/route.ts` | Use `NEXT_PUBLIC_APP_URL` or allowlist origins |
| High | SSRF / URL validation | `app/(default)/brand-dna/actions.ts` | Validate URL scheme and block private IPs/hostnames |
| Medium | File upload | `app/(onboarding)/new/actions.ts` | Magic-byte validation; optional per-file size limit |
| Medium | Error messages | Brand DNA, Stripe checkout | Generic user messages; log details server-side only |
| Medium | XSS | `app/(double-sidebar)/inbox/mail-item.tsx` | Sanitize or keep demo-only and document |
| Medium | Logging | Webhook and others | Avoid/redact PII in logs |
| Low | Auth callback edge cases | `app/auth/callback/route.ts` | Use validated `next` only; clear error path |
| Low | Middleware env | `middleware.ts` | Fail closed when Supabase env missing |
| Low | `/api/hello` | `app/api/hello/route.ts` | Remove or protect |
| Low | Rate limiting | App-wide | Add for sign-in, Brand DNA, campaign create, checkout |
| Low | Security headers | `next.config.js` / middleware | Add CSP, X-Frame-Options, etc. |
| Low | Dependencies | `package.json` | `npm audit`; pin and update deps |

---

## 6. Checklist before production

- [ ] Fix open redirect (1.1)
- [ ] Fix Stripe checkout URLs (1.2)
- [ ] Add URL validation / SSRF protection for Brand DNA (1.3)
- [ ] Add file content validation for uploads (2.1)
- [ ] Harden error responses (2.2)
- [ ] Review logging for PII (2.4)
- [ ] Add rate limiting on sensitive actions
- [ ] Add security headers
- [ ] Run `npm audit` and fix issues
- [ ] Ensure all env vars (especially `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `SCRAPINGBEE_API_KEY`) are set in production and not committed
- [ ] Confirm Stripe webhook endpoint uses HTTPS and correct signing secret for production
- [ ] Confirm Supabase production URL/anon key and RLS policies are correct

---

*End of audit. No code changes were applied; implement the actions above as needed.*
