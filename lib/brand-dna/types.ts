/**
 * Brand DNA profile shape (stored as JSONB in brand_dna.profile).
 * Used for form display and OpenAI extraction.
 */

/** Inferred region from currency/language clues */
export type CurrencyRegion = {
  symbol: string
  region: string
  reasoning?: string
}

/** Optional heuristics: inferred regions, niche tags, notes */
export type BrandDnaHeuristics = {
  currency_regions?: CurrencyRegion[]
  niche_tags?: string[]
  notes?: string
}

export type BrandDnaProfile = {
  // —— Existing strategic fields ——
  /** Ideal Customer Profile / target audience */
  audienceIcp?: string
  /** Core problem the brand solves */
  coreProblem?: string
  /** Language, phrases, and vocabulary the ICP uses */
  icpLanguage?: string
  /** What the audience wants (goals, desires) */
  whatTheyWant?: string
  /** Common objections before buying */
  objections?: string
  /** Triggers that lead to purchase */
  buyingTriggers?: string
  /** Brand story, origin, mission */
  brandStory?: string
  /** Products and offers */
  productsOffer?: string
  /** Value proposition (one clear statement) */
  valueProposition?: string
  /** Brand voice and tone (e.g. professional, friendly, bold) */
  brandVoiceTone?: string
  /** Key differentiators vs competitors */
  keyDifferentiators?: string
  /** Mission and/or vision (if not fully in brand story) */
  missionVision?: string

  // —— Extended / complete profile (industry, positioning, heuristics) ——
  /** Industry (e.g. Fashion, SaaS, Healthcare) */
  industry?: string
  /** Niche within the industry (e.g. Sustainable fashion, B2B DevOps) */
  niche?: string
  /** Tone of voice (short: professional, friendly, bold, luxury, etc.) */
  tone?: string
  /** Primary geographic regions or markets */
  regions?: string[]
  /** Price positioning (e.g. premium, mid-market, budget, freemium) */
  price_positioning?: string
  /** Key brand/product keywords for messaging and SEO */
  keywords?: string[]
  /** Inferred data: currency→region, niche tags, reasoning notes */
  heuristics?: BrandDnaHeuristics
}

export function isBrandDnaProfileEmpty(profile: BrandDnaProfile | null): boolean {
  if (!profile || typeof profile !== 'object') return true
  for (const v of Object.values(profile)) {
    if (typeof v === 'string' && v.trim() !== '') return false
    if (Array.isArray(v) && v.length > 0) return false
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sub = v as Record<string, unknown>
      if (sub.notes && String(sub.notes).trim() !== '') return false
      if (Array.isArray(sub.niche_tags) && sub.niche_tags.length > 0) return false
      if (Array.isArray(sub.currency_regions) && sub.currency_regions.length > 0) return false
    }
  }
  return true
}
