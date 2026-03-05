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

/** Normalize rgb(r,g,b) to hex */
function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

const MAX_STYLESHEET_FETCH = 6
const MAX_STYLESHEET_BYTES = 300_000

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

function countColorsInCss(cssText: string, colorCount: Map<string, number>, accentBoost: number = 0): void {
  const hexRe = /#([0-9a-fA-F]{3})\b|#([0-9a-fA-F]{6})\b/g
  let hexMatch = hexRe.exec(cssText)
  while (hexMatch) {
    const hex = hexMatch[1]
      ? `${hexMatch[1][0]}${hexMatch[1][0]}${hexMatch[1][1]}${hexMatch[1][1]}${hexMatch[1][2]}${hexMatch[1][2]}`
      : hexMatch[2]!
    const normalized = `#${hex.toLowerCase()}`
    colorCount.set(normalized, (colorCount.get(normalized) ?? 0) + 1 + accentBoost)
    hexMatch = hexRe.exec(cssText)
  }
  const rgbRe = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g
  let rgbMatch = rgbRe.exec(cssText)
  while (rgbMatch) {
    const hex = rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]))
    colorCount.set(hex, (colorCount.get(hex) ?? 0) + 1 + accentBoost)
    rgbMatch = rgbRe.exec(cssText)
  }
}

/** Extract 3–5 brand colors and primary font from HTML and same-origin stylesheets. */
async function extractColorsAndFontFromHtml(
  html: string,
  pageUrl: string
): Promise<{ colorPalette: string[]; font?: string }> {
  const colorCount = new Map<string, number>()
  const fontCount = new Map<string, number>()

  const styleBlocks: string[] = []
  const inlineStyleRe = /style\s*=\s*["']([^"']*)["']/gi
  let m = inlineStyleRe.exec(html)
  while (m) {
    styleBlocks.push(m[1])
    m = inlineStyleRe.exec(html)
  }
  const styleTagRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  m = styleTagRe.exec(html)
  while (m) {
    styleBlocks.push(m[1])
    m = styleTagRe.exec(html)
  }
  let cssText = styleBlocks.join(' ')

  const linkRe = /<link\s[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>|<link\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi
  const seen = new Set<string>()
  let totalBytes = 0
  let fetched = 0
  let linkMatch = linkRe.exec(html)
  while (linkMatch && fetched < MAX_STYLESHEET_FETCH && totalBytes < MAX_STYLESHEET_BYTES) {
    const href = (linkMatch[1] || linkMatch[2] || '').trim()
    if (href && !href.startsWith('data:')) {
      const absolute = resolveUrl(href, pageUrl)
      if (absolute && isSameOrigin(absolute, pageUrl) && !seen.has(absolute)) {
        seen.add(absolute)
        try {
          const res = await fetch(absolute, { next: { revalidate: 0 }, signal: AbortSignal.timeout(8000) })
          if (res.ok) {
            const text = await res.text()
            totalBytes += text.length
            cssText += ' ' + text
            fetched++
          }
        } catch {
          // ignore
        }
      }
    }
    linkMatch = linkRe.exec(html)
  }

  const varHexRe = /--[\w-]+\s*:\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g
  let varMatch = varHexRe.exec(cssText)
  while (varMatch) {
    const hex = varMatch[1].length === 3
      ? `${varMatch[1][0]}${varMatch[1][0]}${varMatch[1][1]}${varMatch[1][1]}${varMatch[1][2]}${varMatch[1][2]}`
      : varMatch[1]
    const normalized = `#${hex.toLowerCase()}`
    colorCount.set(normalized, (colorCount.get(normalized) ?? 0) + 5)
    varMatch = varHexRe.exec(cssText)
  }
  const varRgbRe = /--[\w-]+\s*:\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g
  let varRgbMatch = varRgbRe.exec(cssText)
  while (varRgbMatch) {
    const hex = rgbToHex(Number(varRgbMatch[1]), Number(varRgbMatch[2]), Number(varRgbMatch[3]))
    colorCount.set(hex, (colorCount.get(hex) ?? 0) + 5)
    varRgbMatch = varRgbRe.exec(cssText)
  }

  const accentBlockRe = /(primary|accent|button|btn|cta|link|brand|theme)[\s\S]*?\{[\s\S]*?\}/gi
  let blockMatch = accentBlockRe.exec(cssText)
  while (blockMatch) {
    countColorsInCss(blockMatch[0], colorCount, 2)
    blockMatch = accentBlockRe.exec(cssText)
  }

  countColorsInCss(cssText, colorCount, 0)

  const fontRe = /font-family\s*:\s*([^;}"']+)/g
  let fontMatch = fontRe.exec(cssText)
  while (fontMatch) {
    const raw = fontMatch[1].trim()
    const first = raw.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))[0]
    if (first && first.length > 1 && !/^(inherit|initial|unset|serif|sans-serif|monospace)$/i.test(first)) {
      fontCount.set(first, (fontCount.get(first) ?? 0) + 1)
    }
    fontMatch = fontRe.exec(cssText)
  }

  const isVeryLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return r >= 250 && g >= 250 && b >= 250
  }
  const isVeryDark = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return r <= 5 && g <= 5 && b <= 5
  }
  const sorted = Array.from(colorCount.entries())
    .filter(([hex]) => !isVeryLight(hex) && !isVeryDark(hex))
    .sort((a, b) => b[1] - a[1])
  const colorPalette = sorted.slice(0, 5).map(([hex]) => hex)
  if (colorPalette.length < 3 && colorCount.size > 0) {
    const all = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
    for (const hex of all) {
      if (colorPalette.length >= 5) break
      if (!colorPalette.includes(hex)) colorPalette.push(hex)
    }
  }

  const fontSorted = Array.from(fontCount.entries()).sort((a, b) => b[1] - a[1])
  const font = fontSorted[0]?.[0]

  return { colorPalette, font }
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

Visual identity (only when explicitly stated in the page text — do not invent):
- colorPalette: string[] — Use ONLY if the page text explicitly lists hex codes (e.g. "our colors are #1a1a2e and #16213e") or clearly names brand colors. Otherwise always use empty array []. Do not guess or infer colors from context.
- font: string — primary brand font name (e.g. "Inter", "Georgia") if mentioned; otherwise omit.

When information is missing, infer the most reasonable answer and explain in heuristics.notes. Tag notable attributes under heuristics.niche_tags when present.`

const OPENAI_MODEL = 'gpt-4o-mini' // e.g. switch to gpt-4o-nano when available

export type GenerateBrandDnaResult = { error: string } | { ok: true }
export type CreateBrandAndDnaResult = { error: string } | { ok: true; brandId: string; isFirstBrand: boolean }

/** Extract profile from URL (scrape + OpenAI). Shared by generateBrandDna and createBrandAndDna. */
async function extractBrandProfileFromUrl(normalizedUrl: string): Promise<{ profile: BrandDnaProfile } | { error: string }> {
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!scrapingBeeKey) {
    return { error: 'ScrapingBee is not configured. Add SCRAPINGBEE_API_KEY to your environment.' }
  }
  if (!openaiKey) {
    return { error: 'OpenAI is not configured. Add OPENAI_API_KEY to your environment.' }
  }

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

  const { colorPalette, font } = await extractColorsAndFontFromHtml(html, normalizedUrl)

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

    let profile = JSON.parse(content) as BrandDnaProfile
    if (profile && typeof profile === 'object') {
      if (!profile.audienceIcp && (profile as Record<string, unknown>).audience) {
        profile.audienceIcp = (profile as Record<string, unknown>).audience as string
      }
      if (colorPalette.length > 0) {
        profile.colorPalette = colorPalette
      } else {
        profile.colorPalette = []
      }
      if (font) profile.font = font
      else if (typeof profile.font === 'string' && profile.font.trim()) profile.font = profile.font.trim()
    }
    return { profile }
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { error: 'Could not parse brand profile from AI response' }
    }
    console.error('[Brand DNA] AI analysis error:', e)
    return { error: 'Analysis failed. Try again later.' }
  }
}

/** Create a new brand and its Brand DNA from a website URL. Used for first-time onboarding. */
export async function createBrandAndDna(websiteUrl: string): Promise<CreateBrandAndDnaResult> {
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

  const extracted = await extractBrandProfileFromUrl(normalizedUrl)
  if ('error' in extracted) {
    return { error: extracted.error }
  }

  const brandName = (() => {
    try {
      const u = new URL(normalizedUrl)
      return u.hostname.replace(/^www\./, '') || 'My brand'
    } catch {
      return 'My brand'
    }
  })()

  const domain = brandName !== 'My brand' ? brandName : 'my-brand'

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .insert({ user_id: user.id, name: brandName, domain })
    .select('id')
    .single()

  if (brandError || !brand) {
    console.error('[Brand DNA] Create brand error:', brandError)
    return { error: 'Could not create brand. Try again later.' }
  }

  const { error: dnaError } = await supabase.from('brand_dna').insert({
    brand_id: brand.id,
    website_url: normalizedUrl,
    profile: extracted.profile as Record<string, unknown>,
  })

  if (dnaError) {
    console.error('[Brand DNA] Insert brand_dna error:', dnaError)
    await supabase.from('brands').delete().eq('id', brand.id)
    return { error: 'Could not save Brand DNA. Try again later.' }
  }

  const { count: brandCount } = await supabase
    .from('brands')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const isFirstBrand = (brandCount ?? 0) === 1

  return { ok: true, brandId: brand.id, isFirstBrand }
}

export async function generateBrandDna(websiteUrl: string, brandId?: string): Promise<GenerateBrandDnaResult> {
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

  let resolvedBrandId: string
  if (brandId) {
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!brand) {
      return { error: 'Brand not found' }
    }
    resolvedBrandId = brand.id
  } else {
    const { data: brands } = await supabase
      .from('brands')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (!brands?.length) {
      return { error: 'Create a brand first (e.g. from onboarding or add a new brand).' }
    }
    resolvedBrandId = brands[0].id
  }

  const extracted = await extractBrandProfileFromUrl(normalizedUrl)
  if ('error' in extracted) {
    return { error: extracted.error }
  }

  // Upsert brand_dna for the resolved brand
  const { error: dbError } = await supabase
    .from('brand_dna')
    .upsert(
      {
        brand_id: resolvedBrandId,
        website_url: normalizedUrl,
        profile: extracted.profile as Record<string, unknown>,
      },
      { onConflict: 'brand_id' }
    )

  if (dbError) {
    console.error('[Brand DNA] DB upsert error:', dbError)
    return { error: 'Could not save profile. Try again later.' }
  }

  return { ok: true }
}

/** Delete a brand (and its Brand DNA and campaigns via DB cascade). Caller must own the brand. */
export async function deleteBrand(brandId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in' }
  }
  const { data: brand, error: fetchError } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (fetchError || !brand) {
    return { error: 'Brand not found or you do not have permission to delete it.' }
  }
  const { error: deleteError } = await supabase.from('brands').delete().eq('id', brandId)
  if (deleteError) {
    console.error('[Brand DNA] Delete brand error:', deleteError)
    return { error: 'Could not delete brand. Try again later.' }
  }
  return { ok: true }
}
