'use server'

import { createClient } from '@/lib/supabase/server'
import type { BrandDnaProfile } from '@/lib/brand-dna/types'

const SCRAPINGBEE_API = 'https://app.scrapingbee.com/api/v1'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const MAX_HTML_CHARS = 12000
const MAX_URL_LENGTH = 2048

/** Validates URL for SSRF: only http(s), no private/internal hosts. */
function validateWebsiteUrl(normalizedUrl: string): { ok: true; url: string } | { error: string } {
  if (normalizedUrl.length > MAX_URL_LENGTH) {
    return { error: 'URL is too long' }
  }
  let parsed: URL
  try {
    parsed = new URL(normalizedUrl)
  } catch {
    return { error: 'Invalid URL' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only HTTP and HTTPS URLs are allowed' }
  }
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return { error: 'This URL is not allowed' }
  }
  if (hostname === '0.0.0.0' || hostname === '') {
    return { error: 'This URL is not allowed' }
  }
  // IPv4: block private and reserved ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const ipv4Match = hostname.match(ipv4Regex)
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number)
    if (a === 10) return { error: 'This URL is not allowed' }
    if (a === 172 && b >= 16 && b <= 31) return { error: 'This URL is not allowed' }
    if (a === 192 && b === 168) return { error: 'This URL is not allowed' }
    if (a === 127) return { error: 'This URL is not allowed' }
    if (a === 169 && b === 254) return { error: 'This URL is not allowed' }
    if (a === 0) return { error: 'This URL is not allowed' }
  }
  // IPv6: block loopback and link-local
  if (hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')) {
    return { error: 'This URL is not allowed' }
  }
  return { ok: true, url: normalizedUrl }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const BRAND_DNA_SYSTEM_PROMPT = `You are a senior brand strategist. Given the text extracted from a company website, produce a complete Brand DNA profile.

Respond with strictly valid JSON only: no markdown, no code fences, no commentary. The JSON must include every key below; use empty string "" or empty array [] when a value cannot be inferred.

IMPORTANT — Keep these fields SUBSTANTIVE (2–5 sentences or bullet points each). Do not use one-liners; extract and infer full, actionable content from the page:
- audienceIcp / audience: who they sell to, demographics, psychographics, pain points
- coreProblem: the core problem the brand/product solves (detail the problem and how they address it)
- icpLanguage: phrases, vocabulary, and language the ideal customer uses (quote or paraphrase)
- whatTheyWant: goals, desires, outcomes the audience seeks
- objections: common objections or hesitations before buying (list or paragraph)
- buyingTriggers: triggers that lead to purchase (urgency, pain, desire, social proof, etc.)
- brandStory: brand story, origin, mission, or "about" narrative (full paragraph)
- productsOffer: main products and offers — what they sell, key features or tiers
- valueProposition: one clear value proposition statement (can be 1–2 sentences)
- brandVoiceTone: brand voice and tone, with examples or descriptors
- keyDifferentiators: key differentiators vs competitors (bullet points or short paragraph)
- missionVision: mission and/or vision if not fully in brandStory

Short/single-value keys (keep these concise):
- industry: string — e.g. Fashion, SaaS, Healthcare, F&B
- niche: string — specific niche within the industry
- tone: string — brand tone in one or a few words
- regions: string[] — primary geographic regions or markets
- price_positioning: string — e.g. premium, mid-market, budget, freemium, enterprise
- keywords: string[] — 5–15 key brand/product keywords

Optional object heuristics (include when useful):
- heuristics.currency_regions: array of { symbol, region, reasoning? } — infer from €, £, $, etc.
- heuristics.niche_tags: string[] — e.g. "vegan", "cruelty-free", "SaaS", "B2B", "eco-friendly", "luxury", "D2C"
- heuristics.notes: string — brief reasoning when information was missing or inferred

When information is missing, infer the most reasonable answer and explain in heuristics.notes. Tag notable attributes under heuristics.niche_tags when present.`

const OPENAI_MODEL = 'gpt-4o-mini' // e.g. switch to gpt-4o-nano when available

export type GenerateBrandDnaResult = { error: string } | { ok: true }

export async function generateBrandDna(websiteUrl: string): Promise<GenerateBrandDnaResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }

  const url = websiteUrl.trim()
  if (!url) {
    return { error: 'Please enter a website URL' }
  }
  let normalizedUrl = url
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  const validated = validateWebsiteUrl(normalizedUrl)
  if ('error' in validated) {
    return { error: validated.error }
  }
  normalizedUrl = validated.url

  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!scrapingBeeKey) {
    return { error: 'ScrapingBee is not configured. Add SCRAPINGBEE_API_KEY to your environment.' }
  }
  if (!openaiKey) {
    return { error: 'OpenAI is not configured. Add OPENAI_API_KEY to your environment.' }
  }

  // 1. Scrape with ScrapingBee
  const scrapeUrl = `${SCRAPINGBEE_API}?api_key=${encodeURIComponent(scrapingBeeKey)}&url=${encodeURIComponent(normalizedUrl)}`
  let html: string
  try {
    const res = await fetch(scrapeUrl, { next: { revalidate: 0 } })
    if (!res.ok) {
      const text = await res.text()
      console.error('[Brand DNA] Scrape failed:', res.status, text.slice(0, 300))
      return { error: 'Could not fetch website. Try again or use a different URL.' }
    }
    html = await res.text()
  } catch (e) {
    console.error('[Brand DNA] Scrape error:', e)
    return { error: 'Could not fetch website. Try again later.' }
  }

  const text = stripHtmlToText(html)
  const truncated = text.slice(0, MAX_HTML_CHARS)
  if (truncated.length === 0) {
    return { error: 'No readable text found on the page. Try a different URL or page.' }
  }

  // 2. OpenAI: extract Brand DNA
  let profile: BrandDnaProfile
  try {
    const chatRes = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: BRAND_DNA_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract the Brand DNA from this website text:\n\n${truncated}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      next: { revalidate: 0 },
    })

    if (!chatRes.ok) {
      const errBody = await chatRes.text()
      console.error('[Brand DNA] OpenAI error:', chatRes.status, errBody.slice(0, 300))
      return { error: 'Analysis failed. Try again later.' }
    }

    const data = (await chatRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return { error: 'OpenAI did not return a valid response' }
    }

    profile = JSON.parse(content) as BrandDnaProfile
    if (profile && typeof profile === 'object') {
      if (!profile.audienceIcp && (profile as Record<string, unknown>).audience) {
        profile.audienceIcp = (profile as Record<string, unknown>).audience as string
      }
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { error: 'Could not parse brand profile from AI response' }
    }
    console.error('[Brand DNA] AI analysis error:', e)
    return { error: 'Analysis failed. Try again later.' }
  }

  // 3. Upsert brand_dna
  const { error: dbError } = await supabase
    .from('brand_dna')
    .upsert(
      {
        user_id: user.id,
        website_url: normalizedUrl,
        profile: profile as Record<string, unknown>,
      },
      { onConflict: 'user_id' }
    )

  if (dbError) {
    console.error('[Brand DNA] DB upsert error:', dbError)
    return { error: 'Could not save profile. Try again later.' }
  }

  return { ok: true }
}
