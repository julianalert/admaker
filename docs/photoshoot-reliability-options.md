# Photoshoot reliability: options to ensure campaigns complete

## Goal
Make sure photoshoots complete successfully (all images generated) instead of getting stuck "generating" or failing and refunding when the server process is killed by timeouts.

## Why they fail today
- Generation runs in a **single Server Action** request (`runPhotoshootGeneration`).
- Platform (e.g. Vercel) kills the request after **maxDuration** (e.g. 5–10 min).
- 5–9 images × up to ~3 min each can exceed that; the process is killed mid-loop, so status is never updated to `completed` or `failed`.

---

## Option 1: Background job (Inngest, Trigger.dev, etc.) — **best reliability**

**How it works:** When a campaign is created, you enqueue a job with `campaignId`. A worker (not an HTTP request) runs `runPhotoshootGeneration(campaignId)` with no/low timeout. The worker can run 15+ minutes and retry on failure.

**Pros**
- No HTTP timeout; runs as long as needed.
- Built-in retries and observability.
- Fits well with “run to completion or fail and refund.”

**Cons**
- New dependency and setup (Inngest/Trigger.dev account, env vars, deploy).

**Verdict:** Best long-term if you’re okay adding a job queue. Use this if you want maximum reliability and don’t mind the extra service.

---

## Option 2: Resumable generation + cron — **no new vendor**

**How it works:**
- Refactor so **one invocation generates at most one image** and then returns.
- Campaign keeps a shot list (`creative_shot_prompts`); we know how many images we need. Each run: “if we have fewer ads than shots, generate the next one and return.”
- **Client:** After create, in a loop call “generate next image” until the campaign is completed or errors. Each request is ~1–3 min, so no single request hits the platform timeout.
- **Cron:** A Vercel Cron job hits an API route every 1–2 minutes. The route finds campaigns still `generating` and calls the same “generate next image” logic once per campaign. So if the user closes the tab after 2 images, the cron eventually generates the remaining 3.

**Pros**
- No new vendor; only Vercel Cron (built-in).
- Each HTTP request is short (one image), so no timeout issues.
- If the client stays on the page, completion is fast (sequential requests). If they leave, cron finishes the job.

**Cons**
- More logic (resumable state, shot list already in DB).
- Completion can be delayed by cron interval when the user has left.

**Verdict:** Good balance of reliability and simplicity. **Implemented in this repo.**

### Enabling the cron (Vercel)
1. In Vercel → Project → Settings → Environment Variables, add `CRON_SECRET` (e.g. a long random string, at least 16 chars). Vercel will send it as `Authorization: Bearer <CRON_SECRET>` when invoking the cron.
2. Deploy. The cron runs every minute (`* * * * *` in `vercel.json`) and calls `/api/cron/continue-photoshoot`, which runs one generation step per still-generating campaign (up to 5 campaigns per run).

---

## Option 3: Next.js `after()` / Vercel “after response”

**How it works:** Send the HTTP response immediately, then run generation in a callback (e.g. `after()` in Next.js 15.1 or `waitUntil`).

**Pros**
- User gets a fast response.

**Cons**
- The background work often still runs in the **same** serverless invocation, so it can still be **killed by the same timeout** after the response is sent. It does not remove the timeout limit. Not a reliable fix for long-running generation.

**Verdict:** Not sufficient for “all photoshoots complete”; skip for this use case.

---

## Option 4: Raise timeout only (current approach)

**How it works:** Set `maxDuration = 600` or `800` on the route so the Server Action can run 5–10+ minutes.

**Pros**
- No code structure change.

**Cons**
- Platform caps (e.g. Hobby 5 min, Pro ~13 min) may still be too short for 9 images. One slow API call can still push you over. No retry if the process is killed.

**Verdict:** Helps but does not guarantee completion. Use in addition to Option 1 or 2.

---

## Recommendation

- **Short term / minimal change:** Use **Option 2 (resumable + cron)** so each request generates at most one image and cron continues when the user leaves. Keeps reliability without a new vendor.
- **Long term / max reliability:** Add **Option 1 (background job)** and run the same “generate all images” logic in a worker with retries and no HTTP timeout.
