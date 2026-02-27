/**
 * Brand DNA profile shape (stored as JSONB in brand_dna.profile).
 * Used for form display and OpenAI extraction.
 */
export type BrandDnaProfile = {
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
  /** Mission and/or vision (if not fully covered in brand story) */
  missionVision?: string
}

export function isBrandDnaProfileEmpty(profile: BrandDnaProfile | null): boolean {
  if (!profile || typeof profile !== 'object') return true
  const values = Object.values(profile).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  return values.length === 0
}
