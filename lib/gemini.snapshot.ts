/**
 * Snapshot of lib/gemini.ts — duplicate created before rework.
 * Do not import this file; the app uses lib/gemini.ts.
 */

import { GoogleGenAI } from '@google/genai'

/** Prompt for turning a product photo into a studio shot (Nano Banana 2 / gemini-3.1-flash-image-preview). */
export const STUDIO_PRODUCT_PROMPT = `Premium, cinematic studio product photography. Aim for "wow" and visual appeal — not flat or sterile.

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, buttons, dials, textures, logos.
Do NOT alter, redraw, stylize, or regenerate the product.

Scene:
High-end studio with subtle, curated decor. The product is placed on a styled surface (e.g. warm wood, soft fabric, light marble, or textured matte) with correct perspective. Optional: one tasteful prop or element that fits the product (e.g. plant, book, fabric swatch). Controlled studio setup — not a full room, but not a plain void.

Background:
Single-color or very soft gradient studio backdrop (off-white, light gray, beige, blush, warm cream, or neutral tone). Subtle physical texture (paper backdrop, painted wall, matte seamless). Background must look photographed, not generated. Warm, inviting feel — avoid cold or clinical white.

Lighting:
Cinematic studio lighting. Soft key light from the side, gentle fill, visible rim or backlight to add depth and separation. Realistic falloff and natural shadow gradients. Accurate shadow grounding under the product. Avoid flat, even lighting — aim for dimension and mood.

Camera:
Professional DSLR or mirrorless. 85mm lens look, realistic perspective. Shallow depth of field, sharp focus on the product. Real lens behavior.

Style:
Premium e-commerce, cinematic feel. Photorealistic but styled — the kind of shot that makes people say "wow, that looks great." No illustration, no CGI, no plastic smoothing.

Constraints:
Product identical to reference. No warping, no melting edges, no fake reflections, no cartoon elements. Result should feel like a high-end brand campaign, not a catalog flatlay.`

/** Default background color phrase in STUDIO_PRODUCT_PROMPT; replaced by vision suggestion when photoCount=1. */
export const STUDIO_DEFAULT_BACKGROUND_PHRASE = '(off-white, light gray, beige, blush, warm cream, or neutral tone)'

/** Prompt for second image: lifestyle / interior — studio with nice decor, styled environment. */
export const STUDIO_LIFESTYLE_PROMPT = `Premium, cinematic lifestyle product photography. Studio shot with curated decor — "wow they look great" vibe.

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, buttons, dials, textures, logos.
Do NOT alter, redraw, stylize, or regenerate the product.

Scene:
High-end styled studio or interior. The product is placed naturally on a curated surface with correct perspective. Environment feels premium: warm wood, plants, soft textiles, books, or tasteful objects that fit the product. Realistic but aspirational — like a high-end brand campaign.

Lighting:
Cinematic, directional lighting. Soft key from the side, gentle fill, rim or backlight for depth. Natural shadow falloff and grounding under the product. Warm, inviting — avoid flat or clinical light.

Camera:
Professional DSLR or mirrorless. 85mm look, shallow depth of field, sharp focus on the product. Real lens behavior.

Style:
Premium lifestyle photography. Styled, cinematic feel. Photorealistic but visually striking — not sterile or catalog-like.

Background:
Styled interior with curated decor, softly blurred. Natural daylight or warm ambient light. Premium, aspirational feel.

Constraints:
No extra objects touching the product. No warping, no melting edges, no fake reflections, no cartoon elements. Result should feel like a premium brand campaign with nice decor.

Realistic modern interior background, softly blurred, natural daylight, professional lifestyle product photography with curated decor.`

/** Phrase in STUDIO_LIFESTYLE_PROMPT to replace with vision suggestion for the second image (e.g. styled kid bedroom for toy). */
export const STUDIO_LIFESTYLE_DEFAULT_INTERIOR = 'Realistic modern interior background'

const IMAGE_GEN_TIMEOUT_MS = 180_000 // 3 min
const RETRY_DELAY_MS = 30_000 // 30s when API sends retry-after

const IMAGE_MODEL_PRIMARY = 'gemini-3.1-flash-image-preview' // Nano Banana 2: Pro quality, Flash speed/price
const IMAGE_MODEL_FALLBACK = 'gemini-2.5-flash-image'

function getRetryAfterMs(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null
  const headers = (err as { headers?: Headers | Record<string, string> }).headers
  if (!headers) return null
  const value =
    headers instanceof Headers
      ? headers.get('retry-after')
      : (headers as { 'retry-after'?: string })['retry-after']
  if (value == null) return null
  const n = parseInt(String(value), 10)
  return Number.isNaN(n) ? null : n * 1000
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const status =
    (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode
  if (typeof status === 'number' && [500, 502, 503, 429].includes(status)) return true
  const msg = String((err as { message?: string }).message ?? '')
  return /500|502|503|429|timeout|overloaded|try again|internal server error/i.test(msg)
}

/** Supported aspect ratios for image generation (Nano Banana 2 adds 4:1, 1:4, 8:1, 1:8). */
const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', '4:1', '1:4', '8:1', '1:8'] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]

const VISION_MODEL = 'gemini-2.5-flash'

const BACKGROUND_VISION_PROMPT = `Look at this product image. We will generate a premium studio photo of this product with subtle decor. The prompt uses this background line:

"Single-color or very soft gradient studio backdrop (off-white, light gray, beige, blush, warm cream, or neutral tone)."

Replace ONLY the part in parentheses with a short color description that complements this product and feels premium (e.g. "warm sand, soft cream" or "blush pink, pastel" or "soft sage, muted"). Keep it to 2-4 words inside the parentheses. Aim for warm, inviting — not cold or clinical.
Reply with ONLY the parenthetical phrase, including the parentheses. Nothing else. Example: (warm sand, soft cream)`

const LIFESTYLE_INTERIOR_VISION_PROMPT = `Look at this product image. We will generate a lifestyle photo with nice, styled decor. The prompt currently says:

"Realistic modern interior background, softly blurred, natural daylight, professional lifestyle product photography with curated decor."

Replace ONLY "Realistic modern interior background" with a specific styled interior that fits this product and feels premium. Examples: for a kid toy use "Styled modern kid bedroom with warm wood and soft textiles", for kitchen use "Styled modern kitchen with natural materials and plants", for skincare use "Styled modern bathroom shelf with warm lighting", for a book use "Styled living room with bookshelf and warm lamp". Keep the idea: a specific, styled interior that looks like a premium brand campaign — curated decor, warm, inviting.
Reply with ONLY that phrase, nothing else. Example: Styled modern kid bedroom with warm wood and soft textiles`

/**
 * Uses Gemini vision to suggest a background color phrase that complements the product.
 * Returns the phrase including parentheses, or STUDIO_DEFAULT_BACKGROUND_PHRASE on parse failure.
 */
export async function suggestBackgroundColor(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return STUDIO_DEFAULT_BACKGROUND_PHRASE
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: BACKGROUND_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    const match = text.match(/\([^)]+\)/)
    if (match && match[0].length >= 3) {
      return match[0]
    }
  } catch (err) {
    console.error('[suggestBackgroundColor]', err)
  }

  return STUDIO_DEFAULT_BACKGROUND_PHRASE
}

/**
 * Returns the full studio prompt with the background phrase replaced.
 * Use when photoCount=1 after calling suggestBackgroundColor.
 */
export function studioPromptWithBackground(backgroundPhrase: string): string {
  return STUDIO_PRODUCT_PROMPT.replace(STUDIO_DEFAULT_BACKGROUND_PHRASE, backgroundPhrase)
}

/**
 * Uses Gemini vision to suggest an interior type for the lifestyle (second) image based on the product.
 * Returns e.g. "Realistic modern kid bedroom background" or STUDIO_LIFESTYLE_DEFAULT_INTERIOR on failure.
 */
export async function suggestLifestyleInterior(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return STUDIO_LIFESTYLE_DEFAULT_INTERIOR
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: LIFESTYLE_INTERIOR_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim().replace(/^["']|["']\.?$/g, '').trim() ?? ''
    if (text.length >= 10 && text.length <= 120 && /modern .+/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestLifestyleInterior]', err)
  }

  return STUDIO_LIFESTYLE_DEFAULT_INTERIOR
}

/**
 * Returns the full lifestyle prompt with the interior phrase replaced.
 * Use for the second image when photoCount=3 after calling suggestLifestyleInterior.
 */
export function lifestylePromptWithInterior(interiorPhrase: string): string {
  return STUDIO_LIFESTYLE_PROMPT.replace(STUDIO_LIFESTYLE_DEFAULT_INTERIOR, interiorPhrase)
}

/** Fallback for third image (product in action) when LLM fails to generate a valid prompt. */
const FALLBACK_LIFESTYLE_IN_ACTION_PROMPT = `Create a premium, cinematic lifestyle photo featuring the exact product from the reference image.

The product must remain 100% unchanged in shape, size, color, texture, and details.
No redesign, no stylization, no exaggeration.

Scene / Environment:
A styled, modern interior appropriate for this product. Curated decor, warm materials, tasteful props. Premium, aspirational — the kind of setting that makes the product look great.

Product Placement:
The product is placed naturally in the scene where it would be used or displayed. Correct perspective and grounding.

Lighting & Mood:
Cinematic, directional lighting. Soft key light, subtle rim or backlight for depth. Warm, inviting mood. Avoid flat or clinical light. Mood: premium lifestyle, "wow they look great."

Camera & Style:
Professional lifestyle photography. Shallow depth of field, natural grain. Shot like a high-end brand campaign — cinematic feel.

Quality Constraints:
No AI look. No over-smooth skin. No plastic textures. No sterile catalog vibe. Result should feel like a real premium lifestyle photoshoot with visual impact.`

const LIFESTYLE_IN_ACTION_VISION_PROMPT = `You are writing a prompt for an image generation model (Nano Banana 2). The model will receive the product image attached and your text prompt. Your job is to output ONLY the complete prompt text, nothing else — no preamble, no "Here is the prompt", no markdown.

TASK:
1. Analyze the product in the reference image. Identify what the product is and how it is typically used or displayed.
2. Define the single best "product in action" lifestyle shot for this product — styled, cinematic, with nice decor (e.g. a lamp in a child's bedroom at night with a sleeping child; skincare on a styled bathroom shelf; a book on a living room side table with warm lamp).
3. Write a FULL prompt that will be sent to the image generator. The prompt must follow this structure and these rules.

NON-NEGOTIABLE RULES:
- The output must feel PREMIUM and CINEMATIC. Aim for "wow they look great" — not flat or sterile. Styled decor, directional lighting, mood.
- The product from the reference image must remain 100% identical: same shape, size, color, texture, details. No redesign, no stylization.
- Use the same structure as the example: clear section headers (Scene / Environment, Product Placement, Lighting & Mood, Camera & Style, Quality Constraints), each with 2–5 short paragraphs or bullet points.
- Include a closing line that states the image must look like a premium brand lifestyle photoshoot with visual impact.
- No AI look, no over-smooth skin, no plastic textures. State these in Quality Constraints.
- If people appear (e.g. child sleeping), describe them as natural, unposed, realistic — no exaggerated cuteness, real skin texture.

EXAMPLE STRUCTURE (adapt the content to the product, keep this format):

Create a premium, cinematic lifestyle photo featuring the exact product from the reference image.

The product must remain 100% unchanged in shape, size, color, texture, and details.
No redesign, no stylization.

Scene / Environment:
A styled, cozy modern child's bedroom at night. Curated decor: light wood, soft neutral bedding, warm materials. Premium, aspirational feel — the kind of setting that makes the product look great.

Product Placement:
The product is placed naturally (e.g. lamp on bedside table). Correct perspective and grounding.

Lighting & Mood:
Cinematic, directional lighting. Soft key, subtle rim or warm glow. Mood: premium lifestyle, comforting, "wow they look great." Avoid flat or clinical light.

Camera & Style:
Professional lifestyle photography. Shallow depth of field, natural grain. High-end brand campaign feel.

Quality Constraints:
No AI look. No over-smooth skin. No plastic textures. No sterile catalog vibe. The final image must look like a real premium lifestyle photoshoot with visual impact.

OUTPUT: Reply with ONLY your complete prompt in the same style and structure. No other text before or after.`

/**
 * Uses Gemini vision to generate a full "product in action" lifestyle prompt for the third image.
 * The LLM analyzes the product and writes the complete prompt sent to the image model.
 */
export async function suggestLifestyleInActionPrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_LIFESTYLE_IN_ACTION_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: LIFESTYLE_IN_ACTION_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 200 && /(premium|cinematic|ultra-realistic)/i.test(text) && /reference image/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestLifestyleInActionPrompt]', err)
  }

  return FALLBACK_LIFESTYLE_IN_ACTION_PROMPT
}

/** Fallback for 4th image (5-photo flow) when vision fails — lifestyle with product in use by human. */
const FALLBACK_LIFESTYLE_IN_USE_PROMPT = `Premium, cinematic lifestyle product photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign or reinterpret the product.

Scene:
A realistic person is using or holding the product naturally in an appropriate, styled setting. The usage makes sense ergonomically. The setting feels premium — curated decor, warm lighting, aspirational.

Background:
Styled environment appropriate for the product. Warm, inviting, high-end brand feel. Nice decor, not sterile.

Lighting:
Cinematic, directional lighting. Soft key, rim or backlight for depth. Realistic shadows and falloff. Avoid flat or clinical light.

Camera:
Professional photography. Shallow depth of field. Shot like a high-end brand campaign — cinematic feel.

Style:
Premium, cinematic. Physically believable. Commercially viable. Aim for "wow they look great" — not flat ultra-realism.

Constraints:
Product identical to reference. No cliché influencer vibe. No sterile catalog look. Result should feel like a premium professional photoshoot with visual impact.`

const LIFESTYLE_IN_USE_VISION_PROMPT = `You are an elite commercial art director and product advertising photographer.

You are given a product image.

Your job is to analyze the product (its category, material, size, ergonomics, target user, emotional positioning) and generate ONE premium, cinematic lifestyle photography prompt where the product is naturally being used — aim for "wow they look great", not flat or sterile.

The output MUST follow this exact structure and sections:

Scene

Background

Lighting

Camera

Style

Constraints

The result must be:

Premium, cinematic feel

Styled environment with nice decor when appropriate

Physically believable, commercially viable

Not flat ultra-realism — aim for visual impact

Not AI-looking, not over-stylized

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, textures, logos.
Do NOT redesign or reinterpret the product.

Creative Requirements:

The product must be shown in use by a realistic human.

The usage must make sense ergonomically.

The setting must feel premium — curated decor, warm lighting, aspirational when it fits.

The emotion must align with likely buyer psychology.

No cliché Instagram influencer vibe.

No sterile catalog look.

The scene should feel like a high-end brand campaign with cinematic lighting and visual impact.

Avoid generic ideas.
Avoid obvious staged stock-photo energy.

Generate a complete structured prompt ready to be used in an image model.

Only output the structured prompt.`

/**
 * Uses Gemini vision to generate a full lifestyle "product in use by human" prompt for the 4th image (5-photo flow).
 */
export async function suggestLifestyleInUsePrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_LIFESTYLE_IN_USE_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: LIFESTYLE_IN_USE_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 200 && /(premium|cinematic|ultra-realistic)/i.test(text) && /reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestLifestyleInUsePrompt]', err)
  }

  return FALLBACK_LIFESTYLE_IN_USE_PROMPT
}

/** Fallback for 5th image (5-photo flow) when vision fails — non-obvious meaningful context. */
const FALLBACK_NON_OBVIOUS_CONTEXT_PROMPT = `Premium, cinematic advertising photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
The product is placed in a non-obvious but meaningful context. Original, visually striking concept. Could be photographed in real life. Aim for "wow" — bold brand campaign feel.

Background:
Real environment, not a minimal studio. Curated decor or dramatic setting. Creates curiosity or emotional depth.

Lighting:
Cinematic, directional lighting. Dramatic but physically possible. Rim light, warm key, or moody contrast. Avoid flat light.

Camera:
Professional campaign photography. Shallow depth of field, film-like composition. No fantasy, no sci-fi — real photoshoot feel.

Style:
Premium, cinematic. High-end campaign, not product catalog. No floating, no magic, no abstract art. Aim for visual impact.

Constraints:
Product identical to reference. Not the most obvious usage. Avoid clichés. Result should feel like a bold, cinematic brand campaign.`

const NON_OBVIOUS_CONTEXT_VISION_PROMPT = `You are a world-class advertising creative director working for a premium brand.

You are given a product image.

Your job is to analyze the product deeply (form, material, function, symbolism, target demographic, emotional resonance).

Generate ONE highly original, visually striking, premium and cinematic photography concept where the product is present in a non-obvious yet meaningful context. Aim for "wow they look great" — bold campaign feel, not flat or sterile.

The output MUST follow this exact structure:

Scene

Background

Lighting

Camera

Style

Constraints

The result must be:

Premium, cinematic feel — dramatic lighting, mood, visual impact

Physically possible, shot as a real professional photoshoot

Not fantasy, not sci-fi, not surrealism

No floating magical nonsense, no abstract art installation

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, textures, logos.
Do NOT alter or redesign the product.

Creative Requirements:

The idea must NOT be the most obvious usage scenario.

The idea must still make sense conceptually.

It must feel like a bold brand campaign — cinematic lighting, curated setting when appropriate.

It should create curiosity or emotional depth.

It must be something that could realistically be photographed in real life.

Avoid clichés.

Avoid Pinterest-level ideas.

Avoid minimal studio setups (this is not a studio shot).

Think high-end campaign photography with wow factor, not product catalog.

Generate a complete structured prompt ready to feed into an image generation model.

Only output the structured prompt.`

/**
 * Uses Gemini vision to generate a full "non-obvious meaningful context" prompt for the 5th image (5-photo flow).
 */
export async function suggestNonObviousContextPrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_NON_OBVIOUS_CONTEXT_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: NON_OBVIOUS_CONTEXT_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 200 && /(premium|cinematic|ultra-realistic)/i.test(text) && /reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestNonObviousContextPrompt]', err)
  }

  return FALLBACK_NON_OBVIOUS_CONTEXT_PROMPT
}

/** Fallback for 6th image (7-photo flow) when vision fails — full UGC styler: person using product, iPhone feel, all UGC codes. */
const FALLBACK_UGC_STYLER_PROMPT = `Ultra-realistic user-generated content (UGC) style photo.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
A real person (authentic, relatable, not a professional model) is using or holding the product naturally. The moment feels genuine and unscripted, like real UGC from a customer or creator.

UGC codes (all must be present):
- Shot as if on an iPhone or smartphone: natural smartphone lens look, slight grain, realistic mobile camera quality.
- Vertical or portrait framing typical for Stories/Reels (9:16 or 4:5 feel).
- Casual, authentic setting — home, car, outdoors, etc. — not a studio.
- Natural or available lighting; no heavy professional setup.
- Direct-to-camera or candid angle; person may be speaking or showing the product.
- Relatable, testimonial or unboxing vibe; slight imperfections are fine.
- No over-produced or ad-agency polish; must look like real user content.

Camera:
iPhone/smartphone camera aesthetic. Realistic mobile photography. No DSLR look.

Style:
Full UGC. Authentic. Believable as content a real person would post. No AI smoothness, no plastic skin, no stock-photo stiffness.

Constraints:
Product identical to reference. Full UGC codes. Must look like it was shot on a phone by a real user.
Ultra-realistic result indistinguishable from real UGC content.`

const UGC_STYLER_VISION_PROMPT = `You are an expert in user-generated content (UGC) and social media advertising.

You are given a product image.

Your job is to analyze the product and generate ONE complete image prompt so the result looks like FULL UGC: a real person using or showing the product, shot as if on an iPhone, with all the UGC codes.

The output MUST be a complete prompt ready for an image generation model. Use this structure:

Scene

UGC codes (list or describe: smartphone/iPhone look, vertical framing, casual setting, natural light, authentic person, direct-to-camera or candid, relatable, testimonial vibe, no over-produced polish)

Camera

Style

Constraints

Requirements:
- The image must BE FULL UGC: indistinguishable from real content a user would post (Stories, Reels, TikTok).
- Shot as if on iPhone/smartphone: natural mobile camera quality, realistic grain, smartphone lens feel.
- Include ALL UGC codes: vertical/portrait framing, casual environment, natural lighting, authentic relatable person (not model), direct to camera or candid, unscripted feel.
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign the product.
- Ultra-realistic. No AI look. No plastic skin. No stock-photo stiffness.
- Only output the complete structured prompt, nothing else.`

/**
 * Uses Gemini vision to generate a full "UGC Styler" prompt for the 6th image (7-photo flow).
 * Result must look like real UGC: person using product, shot on iPhone, all UGC codes.
 */
export async function suggestUgcStylerPrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_UGC_STYLER_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: UGC_STYLER_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 150 && /UGC|iPhone|smartphone|reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestUgcStylerPrompt]', err)
  }

  return FALLBACK_UGC_STYLER_PROMPT
}

/** Fallback for 7th image (7-photo flow) when vision fails — cinematic product in use. */
const FALLBACK_CINEMATIC_PRODUCT_IN_USE_PROMPT = `Premium cinematic product photography — the "wow" shot. Double down on film-like mood and visual impact.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
The product is shown in use in a striking, cinematic context. Dramatic composition. Film-like storytelling. High production value, iconic — the kind of image that stops the scroll.

Background:
Atmospheric environment. Golden hour, moody interior, or dramatic natural setting. Cinematic depth and layers. Rich, not flat.

Lighting:
Strong cinematic lighting. Key light, rim light, or backlight. Film-like contrast and color grading. Dramatic but realistic. Avoid flat or even light.

Camera:
Shot like a high-end commercial or film. Shallow depth of field. Anamorphic or premium lens feel. Tension, motion, or gravitas where appropriate.

Style:
Cinematic. Cool. Premium. Product in use feels iconic and memorable. No fantasy, no sci-fi — physically possible real-world shoot. Aim for "wow they look great."

Constraints:
Product identical to reference. Ultra-realistic product, cinematic mood. Indistinguishable from a real high-end commercial.`

const CINEMATIC_PRODUCT_IN_USE_VISION_PROMPT = `You are a world-class commercial director and cinematographer.

You are given a product image.

Your job is to analyze the product and generate ONE complete image prompt for a CINEMATIC product-in-use shot — the "wow" image. Film-like, high production value, dramatic lighting, with the product in use in a striking, memorable way. This image type is a consistent hit — double down on mood and visual impact.

The output MUST be a complete prompt ready for an image generation model. Use this structure:

Scene

Background

Lighting

Camera

Style

Constraints

Requirements:
- The result must feel CINEMATIC: dramatic lighting, film-like color grading, premium composition, shallow depth of field, anamorphic or high-end lens feel. Aim for "wow they look great."
- The product must be shown IN USE (or in a striking in-context moment) — not just on a shelf. Cool, memorable, iconic.
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign the product.
- Ultra-realistic product, cinematic mood. Physically possible. No fantasy or sci-fi. As if shot on a real high-end commercial.
- Only output the complete structured prompt, nothing else.`

/**
 * Uses Gemini vision to generate a full "cinematic product in use" prompt for the 7th image (7-photo flow).
 */
export async function suggestCinematicProductInUsePrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_CINEMATIC_PRODUCT_IN_USE_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: CINEMATIC_PRODUCT_IN_USE_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 150 && /cinematic|reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestCinematicProductInUsePrompt]', err)
  }

  return FALLBACK_CINEMATIC_PRODUCT_IN_USE_PROMPT
}

/** Fallback for 8th image (9-photo flow) when vision fails — macro detail shot: texture close-up, premium perception. */
const FALLBACK_MACRO_DETAIL_PROMPT = `Premium, cinematic macro product photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
Extreme close-up macro shot highlighting texture, material, and fine details. Premium, tactile perception. Dramatic lighting on texture — the viewer feels they can almost touch the surface.

Background:
Soft, out-of-focus or minimal so all attention is on the product detail. No clutter.

Lighting:
Cinematic, controlled lighting that reveals texture and depth. Strong highlights and soft shadows on edges and surfaces. Premium product-photography quality — not flat.

Camera:
Macro lens. Shallow depth of field. Sharp focus on the key texture or detail area. Shot as high-end product or beauty macro.

Style:
Premium, cinematic feel. Tactile. The image communicates quality and craftsmanship through detail. No AI smoothness, no plastic look. Aim for visual impact.

Constraints:
Product identical to reference. Focus on texture and material detail. Indistinguishable from a real premium macro product photoshoot.`

const MACRO_DETAIL_VISION_PROMPT = `You are an expert in premium product and macro photography.

You are given a product image.

Your job is to analyze the product (materials, textures, surfaces, details that convey quality) and generate ONE complete image prompt for a MACRO DETAIL shot: extreme close-up on texture or a key detail with premium, cinematic lighting — dramatic light on texture, tactile perception, "wow" factor.

The output MUST be a complete prompt ready for an image generation model. Use this structure:

Scene

Background

Lighting

Camera

Style

Constraints

Requirements:
- The image must be a MACRO/CLOSE-UP: focus on texture, material, fine details that make the product feel premium and tangible.
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign the product.
- Premium, cinematic lighting on texture — not flat. Strong highlights, soft shadows, depth.
- Premium perception: the viewer should feel the quality and craftsmanship.
- No AI smoothness. No plastic look. Only output the complete structured prompt, nothing else.`

/**
 * Uses Gemini vision to generate a full "macro detail" prompt for the 8th image (9-photo flow).
 * Texture close-up, premium perception.
 */
export async function suggestMacroDetailPrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_MACRO_DETAIL_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: MACRO_DETAIL_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 150 && /macro|texture|detail|reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestMacroDetailPrompt]', err)
  }

  return FALLBACK_MACRO_DETAIL_PROMPT
}

/** Fallback for 9th image (9-photo flow) when vision fails — social hook shot: scroll-stopping weird visual for ads. */
const FALLBACK_SOCIAL_HOOK_PROMPT = `Premium, cinematic scroll-stopping advertising image.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
A surprising, eye-catching, or slightly "weird" visual concept that stops the scroll. Unexpected angle, juxtaposition, or visual hook. Premium and brand-safe, memorable, thumb-stopping for social ads. Cinematic or bold lighting.

Background:
Bold, simple, or contrasting. Supports the hook without distracting. Can be dark and moody or high-contrast for impact.

Lighting:
Cinematic or dramatic. Strong key, rim light, or high-contrast. Creates tension and curiosity. Avoid flat light.

Camera:
Strong composition. Unusual angle, Dutch angle, or framing that creates tension or curiosity. Feels native to social feeds and premium ads.

Style:
Scroll-stopping. Cinematic when it fits. Memorable. Premium brand feel with a creative hook. No generic stock look. Aim for "wow they look great."

Constraints:
Product identical to reference. Concept must be physically possible and photographable. Safe for ads. Indistinguishable from a real campaign asset.`

const SOCIAL_HOOK_VISION_PROMPT = `You are an expert in scroll-stopping social and performance advertising creative.

You are given a product image.

Your job is to analyze the product and generate ONE complete image prompt for a SOCIAL HOOK shot: scroll-stopping, slightly weird or surprising visual that works for ads (Meta, TikTok, etc.). The image should stop the thumb — unexpected angle, juxtaposition, or visual hook — while staying premium and brand-safe. Use cinematic or bold lighting when it fits — aim for "wow they look great."

The output MUST be a complete prompt ready for an image generation model. Use this structure:

Scene

Background

Lighting

Camera

Style

Constraints

Requirements:
- The image must be SCROLL-STOPPING: surprising, eye-catching, or "weird in a good way" — something that makes people pause in the feed.
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign the product.
- Premium and brand-safe. Cinematic or dramatic lighting when it supports the hook. No offensive or random nonsense. Physically possible to photograph.
- Memorable. Feels native to high-performing social ads. Only output the complete structured prompt, nothing else.`

/**
 * Uses Gemini vision to generate a full "social hook" prompt for the 9th image (9-photo flow).
 * Scroll-stopping weird visual for ads.
 */
export async function suggestSocialHookPrompt(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return FALLBACK_SOCIAL_HOOK_PROMPT
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: SOCIAL_HOOK_VISION_PROMPT },
      ],
    })

    const text = response.text?.trim() ?? ''
    if (text.length >= 150 && /scroll|hook|reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestSocialHookPrompt]', err)
  }

  return FALLBACK_SOCIAL_HOOK_PROMPT
}

// --- Creative Director: one-shot shoot plan (5 or 9 photos) ---

export type CreativeDirectorShot = { ad_type: string; prompt: string }

const CREATIVE_DIRECTOR_GLOBAL_CONSTRAINTS = `
MANDATORY STRUCTURE FOR EVERY PROMPT:
Each "prompt" you write must be structured exactly with these six sections (with that exact heading text). Under each heading, write your original, detailed content. No section may be empty.

Scene

Background

Lighting

Camera

Style

Constraints

GLOBAL RULES (non-negotiable for every prompt):
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter, redraw, stylize, or regenerate the product.
- Cinematic style: premium, film-like where it fits. "Wow they look great." High-end brand campaign feel — not catalog or sterile.
- Ultra-realistic: no fantasy, no sci-fi, no cartoon. No warping, no melting edges, no fake reflections. Physically believable.
- No AI look. No over-smooth skin. No plastic textures. No plastic look. No stock-photo stiffness. The result must feel like a real photoshoot, not AI-generated.
- Premium perception: the viewer should feel the quality and craftsmanship. Tactile, aspirational, premium.
- If humans appear in a shot: they must be ultra-realistic. Real skin texture, natural features, no over-smoothing, no plastic or doll-like look. Describe them as natural, unposed, realistic — no exaggerated cuteness or perfection.
- You are the complete creator: write every prompt from scratch. Invent the scene, setting, lighting, mood, and story for THIS product. Be specific and original under each section. No fill-in-the-blank; no generic placeholders.
`

const CREATIVE_DIRECTOR_9_META = `You are an AI creative director and cinematographer for an e‑commerce brand. You are given one product image. Your job is to conceive and write a full photoshoot of 9 images. You are the complete creator: you invent every scene from scratch. No templates. Each prompt you output will be sent as-is to an image generation model (which also receives the product image). So each "prompt" must be a complete, detailed, original image brief — rich, specific, written for this product only.

OUTPUT: Exactly 9 shots. Each shot = one object with "ad_type" and "prompt". The "prompt" is the full creative brief for that image: write it like a world-class commercial director. Original scenes only. Every prompt must use the six-section structure: Scene, Background, Lighting, Camera, Style, Constraints (with that exact heading text and your original content under each).

STUDIO (3 shots): Product with decor. You invent the exact setup: what surface, what props, what mood, what light. Each of the 3 must be a distinct, original concept. Labels: studio, studio_2, and for the third use contextual or creative or studio.

LIFESTYLE (6 shots): Product in context, in use, or with people. You MUST include at least one of each of these types (assign the label accordingly):
- ugc_styler: UGC-style, authentic, phone-shot feel, relatable.
- influencer: Person showing or holding the product, aspirational but relatable.
- product_in_use: Product being used naturally in a realistic setting.
- cinematic: Film-like, dramatic lighting, high production value — write it like the best cinematic product spot.
- social_hook: Crazy, scroll-stopping concept — unexpected angle, surprising visual, thumb-stopping. Invent the concept.
- One more of your choice: macro_detail, creative, or lifestyle — again, full original prompt.

Use these ad_type values: studio, studio_2, contextual, lifestyle, creative, ugc_styler, influencer, product_in_use, cinematic, macro_detail, social_hook. One label per shot (9 total).

Write every prompt as a complete creator: full, detailed, original. No boilerplate. Output ONLY a valid JSON array of 9 objects, each with keys "ad_type" and "prompt". No markdown, no code block wrapper. Example shape: [{"ad_type":"studio","prompt":"Your full original prompt here..."},{"ad_type":"studio_2","prompt":"..."}, ...]
` + CREATIVE_DIRECTOR_GLOBAL_CONSTRAINTS

const CREATIVE_DIRECTOR_5_META = `You are an AI creative director and cinematographer for an e‑commerce brand. You are given one product image. Your job is to conceive and write a photoshoot of 5 images. You are the complete creator: you invent every scene from scratch. No templates. Each prompt you output will be sent as-is to an image generation model (which also receives the product image). So each "prompt" must be a complete, detailed, original image brief — rich, specific, written for this product only.

OUTPUT: Exactly 5 shots. Each shot = one object with "ad_type" and "prompt". The "prompt" is the full creative brief for that image: write it like a world-class commercial director. Original scenes only. Every prompt must use the six-section structure: Scene, Background, Lighting, Camera, Style, Constraints (with that exact heading text and your original content under each).

STUDIO (2 shots): Product with decor. You invent the exact setup for each. Labels: studio, studio_2.

LIFESTYLE (3 shots): You MUST include:
- ugc_styler: UGC-style, authentic, phone-shot feel.
- influencer: Person showing or holding the product.
- One of: product_in_use (product in use naturally) OR social_hook (crazy, scroll-stopping concept). Prefer including a social hook as one of the 3.

Use these ad_type values: studio, studio_2, ugc_styler, influencer, product_in_use, social_hook. One label per shot (5 total).

Write every prompt as a complete creator: full, detailed, original. No boilerplate. Output ONLY a valid JSON array of 5 objects, each with keys "ad_type" and "prompt". No markdown, no code block wrapper. Example shape: [{"ad_type":"studio","prompt":"Your full original prompt here..."}, ...]
` + CREATIVE_DIRECTOR_GLOBAL_CONSTRAINTS

/**
 * Calls the creative director (Gemini vision) to plan a full shoot: returns N labeled prompts
 * (N = 5 or 9) tailored to the product. More free, product-led process.
 * Returns null on API failure or invalid output; caller should fall back to legacy per-slot prompts.
 */
export async function planCreativeDirectorShoot(
  productImageBuffer: Buffer,
  mimeType: string,
  options: { photoCount: 5 | 9 }
): Promise<CreativeDirectorShot[] | null> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'
  const meta = options.photoCount === 9 ? CREATIVE_DIRECTOR_9_META : CREATIVE_DIRECTOR_5_META
  const expectedCount = options.photoCount

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: meta },
      ],
    })

    const text = response.text?.trim() ?? ''
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const parsed = JSON.parse(cleaned) as unknown

    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null

    const shots: CreativeDirectorShot[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || !('ad_type' in item) || !('prompt' in item)) return null
      const ad_type = String((item as { ad_type: unknown }).ad_type).trim()
      const prompt = String((item as { prompt: unknown }).prompt).trim()
      if (!ad_type || !prompt || prompt.length < 100) return null
      shots.push({ ad_type, prompt })
    }
    return shots
  } catch (err) {
    console.error('[planCreativeDirectorShoot]', err)
    return null
  }
}

/**
 * Fallback when planCreativeDirectorShoot fails: build 5 or 9 shots using existing per-slot suggest* functions.
 * Used only when the creative director API fails or returns invalid output.
 */
export async function getCreativeDirectorShootFallback(
  productImageBuffer: Buffer,
  mimeType: string,
  options: { photoCount: 5 | 9 }
): Promise<CreativeDirectorShot[]> {
  const { photoCount } = options
  if (photoCount === 5) {
    const [backgroundPhrase, interiorPhrase, ugcPrompt, lifestyleInUsePrompt, socialHookPrompt] = await Promise.all([
      suggestBackgroundColor(productImageBuffer, mimeType),
      suggestLifestyleInterior(productImageBuffer, mimeType),
      suggestUgcStylerPrompt(productImageBuffer, mimeType),
      suggestLifestyleInUsePrompt(productImageBuffer, mimeType),
      suggestSocialHookPrompt(productImageBuffer, mimeType),
    ])
    const studioPrompt = studioPromptWithBackground(backgroundPhrase)
    const lifestylePrompt = lifestylePromptWithInterior(interiorPhrase)
    return [
      { ad_type: 'studio', prompt: studioPrompt },
      { ad_type: 'studio_2', prompt: lifestylePrompt },
      { ad_type: 'ugc_styler', prompt: ugcPrompt },
      { ad_type: 'influencer', prompt: lifestyleInUsePrompt },
      { ad_type: 'social_hook', prompt: socialHookPrompt },
    ]
  }
  // 9 photos
  const [
    backgroundPhrase,
    interiorPhrase,
    inActionPrompt,
    lifestyleInUsePrompt,
    nonObviousPrompt,
    ugcPrompt,
    cinematicPrompt,
    macroPrompt,
    socialHookPrompt,
  ] = await Promise.all([
    suggestBackgroundColor(productImageBuffer, mimeType),
    suggestLifestyleInterior(productImageBuffer, mimeType),
    suggestLifestyleInActionPrompt(productImageBuffer, mimeType),
    suggestLifestyleInUsePrompt(productImageBuffer, mimeType),
    suggestNonObviousContextPrompt(productImageBuffer, mimeType),
    suggestUgcStylerPrompt(productImageBuffer, mimeType),
    suggestCinematicProductInUsePrompt(productImageBuffer, mimeType),
    suggestMacroDetailPrompt(productImageBuffer, mimeType),
    suggestSocialHookPrompt(productImageBuffer, mimeType),
  ])
  const studioPrompt = studioPromptWithBackground(backgroundPhrase)
  const lifestylePrompt = lifestylePromptWithInterior(interiorPhrase)
  return [
    { ad_type: 'studio', prompt: studioPrompt },
    { ad_type: 'studio_2', prompt: lifestylePrompt },
    { ad_type: 'contextual', prompt: inActionPrompt },
    { ad_type: 'lifestyle', prompt: lifestyleInUsePrompt },
    { ad_type: 'creative', prompt: nonObviousPrompt },
    { ad_type: 'ugc_styler', prompt: ugcPrompt },
    { ad_type: 'cinematic', prompt: cinematicPrompt },
    { ad_type: 'macro_detail', prompt: macroPrompt },
    { ad_type: 'social_hook', prompt: socialHookPrompt },
  ]
}

/**
 * Build 3, 5, 7, or 9 shots using per-slot suggest* functions (ultra-realistic flow, no creative director).
 */
export async function getUltraRealisticShoot(
  productImageBuffer: Buffer,
  mimeType: string,
  options: { photoCount: 3 | 5 | 7 | 9 }
): Promise<CreativeDirectorShot[]> {
  const { photoCount } = options
  if (photoCount === 3) {
    const [backgroundPhrase, interiorPhrase, inActionPrompt] = await Promise.all([
      suggestBackgroundColor(productImageBuffer, mimeType),
      suggestLifestyleInterior(productImageBuffer, mimeType),
      suggestLifestyleInActionPrompt(productImageBuffer, mimeType),
    ])
    const studioPrompt = studioPromptWithBackground(backgroundPhrase)
    const lifestylePrompt = lifestylePromptWithInterior(interiorPhrase)
    return [
      { ad_type: 'studio', prompt: studioPrompt },
      { ad_type: 'studio_2', prompt: lifestylePrompt },
      { ad_type: 'contextual', prompt: inActionPrompt },
    ]
  }
  if (photoCount === 5) {
    return getCreativeDirectorShootFallback(productImageBuffer, mimeType, { photoCount: 5 })
  }
  if (photoCount === 7) {
    const shots9 = await getCreativeDirectorShootFallback(productImageBuffer, mimeType, { photoCount: 9 })
    return shots9.slice(0, 7)
  }
  return getCreativeDirectorShootFallback(productImageBuffer, mimeType, { photoCount: 9 })
}

/** Try one model. maxRetries = 0 means one attempt only; 2 = up to 3 attempts with backoff. */
async function generateWithModel(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  base64: string,
  mime: string,
  maxRetries: number,
  options?: { prompt?: string; aspectRatio?: string }
): Promise<Buffer | null> {
  const prompt = options?.prompt ?? STUDIO_PRODUCT_PROMPT
  const generationConfig =
    options?.aspectRatio && ASPECT_RATIOS.includes(options.aspectRatio as AspectRatio)
      ? { image_config: { aspect_ratio: options.aspectRatio } }
      : undefined

  const maxAttempts = maxRetries + 1
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const interaction = await ai.interactions.create(
        {
          model,
          input: [
            { type: 'text', text: prompt },
            { type: 'image', data: base64, mime_type: mime },
          ],
          response_modalities: ['image'],
          ...(generationConfig && {
            // SDK types don't yet include Nano Banana 2 aspect ratios (4:1, 1:4, 8:1, 1:8); API supports them
            generation_config: generationConfig as never,
          }),
        },
        { timeout: IMAGE_GEN_TIMEOUT_MS }
      )

      for (const output of interaction.outputs ?? []) {
        if (output.type === 'image' && output.data) {
          return Buffer.from(output.data, 'base64')
        }
      }
      return null
    } catch (err) {
      console.error(`[${model}] attempt ${attempt}/${maxAttempts} failed`, err)
      if (attempt < maxAttempts && isRetryable(err)) {
        const waitMs = getRetryAfterMs(err) ?? RETRY_DELAY_MS
        console.error(`[${model}] retrying in ${Math.round(waitMs / 1000)}s...`)
        await new Promise((r) => setTimeout(r, waitMs))
      } else {
        return null
      }
    }
  }
  return null
}


/**
 * Generates one studio product image from a reference product photo.
 * Uses Nano Banana 2 (gemini-3.1-flash-image-preview) first for Pro quality at Flash speed/price;
 * falls back to gemini-2.5-flash-image if needed.
 * @param format - Aspect ratio for output: "1:1" | "9:16" | "16:9" | "4:3" | "4:1" | "1:4" | "8:1" | "1:8" etc. (default 1:1)
 * @param prompt - Optional prompt override; defaults to STUDIO_PRODUCT_PROMPT
 */
export async function generateStudioProductImage(
  productImageBuffer: Buffer,
  mimeType: string,
  options?: { format?: string; prompt?: string }
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY or GEMINI_API_KEY')
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'
  const aspectRatio =
    options?.format && ASPECT_RATIOS.includes(options.format as AspectRatio) ? options.format : undefined
  const genOptions =
    aspectRatio || options?.prompt
      ? { aspectRatio, prompt: options?.prompt }
      : undefined

  // Nano Banana 2 first (Pro quality, Flash speed/price); then fallback with retries
  let result = await generateWithModel(ai, IMAGE_MODEL_PRIMARY, base64, mime, 2, genOptions)
  if (result) return result

  console.error(`[${IMAGE_MODEL_PRIMARY}] failed, trying fallback ${IMAGE_MODEL_FALLBACK}`)
  result = await generateWithModel(ai, IMAGE_MODEL_FALLBACK, base64, mime, 2, genOptions)
  if (result) return result

  throw new Error('Image generation failed. Please try again.')
}
