import { GoogleGenAI } from '@google/genai'

/** Prompt for turning a product photo into a studio shot (Nano Banana 2 / gemini-3.1-flash-image-preview). */
export const STUDIO_PRODUCT_PROMPT = `Ultra-realistic professional product photoshoot.

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, buttons, dials, textures, logos.
Do NOT alter, redraw, stylize, or regenerate the product.

Scene:
High-end studio product photography with cinematic realism.
The product is placed naturally on a studio surface with correct perspective.
No real-world environment, no interior, no lifestyle context.
This is a controlled studio setup, not a real location.

Background:
Single-color or very soft gradient studio backdrop (off-white, light gray, beige, blush, or neutral tone).
Subtle physical studio texture visible (paper backdrop, painted wall, matte seamless, or fine grain).
Background must look photographed, not generated.
No objects, no scenery, no room elements, no horizon line.

Lighting:
Professional studio lighting setup.
Soft key light from the side, gentle fill light, subtle rim light to separate the product from the background.
Realistic light falloff and natural shadow gradients.
Accurate shadow grounding under the product (contact shadow + soft cast shadow).
No flat lighting, no overexposure, no artificial glow.

Camera:
Shot with a professional DSLR or mirrorless camera.
85mm lens look, realistic perspective compression.
Shallow but natural depth of field, sharp focus on the product.
Real lens behavior, no distortion.

Style:
Premium e-commerce studio photography.
Photorealistic, natural, believable.
No illustration style, no CGI look, no plastic smoothing.

Constraints:
No extra objects.
No warping.
No melting edges.
No fake reflections.
No stylized or cartoon elements.
Ultra-realistic result indistinguishable from a real studio photoshoot.`

/** Default background color phrase in STUDIO_PRODUCT_PROMPT; replaced by vision suggestion when photoCount=1. */
export const STUDIO_DEFAULT_BACKGROUND_PHRASE = '(off-white, light gray, beige, blush, or neutral tone)'

/** Prompt for second image: lifestyle / interior background (same product, different scene). */
export const STUDIO_LIFESTYLE_PROMPT = `Ultra-realistic professional product photoshoot.

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, buttons, dials, textures, logos.
Do NOT alter, redraw, stylize, or regenerate the product.

Scene:
High-end professional studio photography with cinematic realism.
The product is placed naturally on a surface with correct perspective.
Realistic physical lighting with directional light, soft shadows, and subtle highlights.
Natural depth of field, non-flat lighting, real lens behavior.

Lighting:
Soft key light from the side, gentle fill light, subtle rim light to separate the product from the background.
Accurate shadow grounding under the product (contact shadow + soft cast shadow).
No flat lighting, no overexposure, no artificial glow.

Camera:
Shot with a professional DSLR or mirrorless camera.
85mm lens look, realistic perspective compression.
Shallow but natural depth of field, sharp focus on the product.

Style:
Premium e-commerce photography.
Photorealistic, natural, believable.
No illustration style, no CGI look, no plastic smoothing.

Background:
Clean, realistic environment appropriate for a high-end product photoshoot.
Soft gradients or subtle studio textures.
Background must look photographed, not generated.

Constraints:
No extra objects touching the product.
No warping.
No melting edges.
No fake reflections.
No stylized or cartoon elements.
Ultra realistic result indistinguishable from a real photoshoot.

Realistic modern interior background, softly blurred, natural daylight, professional lifestyle product photography.`

/** Phrase in STUDIO_LIFESTYLE_PROMPT to replace with vision suggestion for the second image (e.g. kid bedroom for toy). */
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

const BACKGROUND_VISION_PROMPT = `Look at this product image. We will generate a studio photo of this product with the following background line in the prompt:

"Single-color or very soft gradient studio backdrop (off-white, light gray, beige, blush, or neutral tone)."

Replace ONLY the part in parentheses with a short color description that complements this product (e.g. "pink salmon, pastel" or "warm beige, soft cream" or "soft mint, pastel"). Keep it to 2-4 words inside the parentheses.
Reply with ONLY the parenthetical phrase, including the parentheses. Nothing else. Example: (pink salmon, pastel)`

const LIFESTYLE_INTERIOR_VISION_PROMPT = `Look at this product image. We will generate a lifestyle photo of this product in a realistic interior. The prompt currently says:

"Realistic modern interior background, softly blurred, natural daylight, professional lifestyle product photography."

Replace ONLY "Realistic modern interior background" with a specific interior type that fits this product. Examples: for a kid toy use "Realistic modern kid bedroom background", for a kitchen appliance use "Realistic modern kitchen counter background", for skincare use "Realistic modern bathroom shelf background", for a book use "Realistic modern living room background". Keep the same style: "Realistic modern [specific interior] background".
Reply with ONLY that phrase, nothing else. Example: Realistic modern kid bedroom background`

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
    if (text.length >= 10 && text.length <= 100 && /realistic modern .+ background/i.test(text)) {
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
const FALLBACK_LIFESTYLE_IN_ACTION_PROMPT = `Create an ultra-realistic lifestyle photo featuring the exact product from the reference image.

The product must remain 100% unchanged in shape, size, color, texture, and details.
No redesign, no stylization, no exaggeration.

Scene / Environment:
A realistic, modern interior appropriate for this product. Clean, uncluttered, believable setting. Natural materials and tasteful decor.

Product Placement:
The product is placed naturally in the scene where it would realistically be used or displayed. Correct perspective and grounding.

Lighting & Mood:
Natural, realistic lighting. Soft shadows. No neon glow, no halo, no magical effects. Mood: authentic, premium lifestyle.

Camera & Style:
Professional lifestyle photography. Shot at a natural eye-level or slightly above. Shallow depth of field, natural grain, real camera feel.

Quality Constraints (non-negotiable):
No AI look. No over-smooth skin. No plastic textures. No dreamy fantasy vibe. No stock-photo stiffness.
Ultra-realistic result indistinguishable from a real lifestyle photoshoot.`

const LIFESTYLE_IN_ACTION_VISION_PROMPT = `You are writing a prompt for an image generation model (Nano Banana 2). The model will receive the product image attached and your text prompt. Your job is to output ONLY the complete prompt text, nothing else — no preamble, no "Here is the prompt", no markdown.

TASK:
1. Analyze the product in the reference image. Identify what the product is and how it is typically used or displayed.
2. Define the single best "product in action" lifestyle shot for this product (e.g. a lamp in a child's bedroom at night with a sleeping child; a skincare bottle on a bathroom shelf; a book on a living room side table).
3. Write a FULL prompt that will be sent to the image generator. The prompt must follow this structure and these non-negotiable rules.

NON-NEGOTIABLE RULES:
- The output must be ULTRA-REALISTIC. State this clearly. The final image must look like a real photoshoot, not AI-generated.
- The product from the reference image must remain 100% identical: same shape, size, color, texture, details. No redesign, no stylization, no glow exaggeration.
- Use the same structure as the example below: clear section headers (Scene / Environment, Product Placement, Lighting & Mood, Camera & Style, Quality Constraints), each with 2–5 short paragraphs or bullet points.
- Include a closing line that states the image must look like a real lifestyle photoshoot for a premium brand.
- No AI look, no over-smooth skin, no plastic textures, no dreamy fantasy, no stock-photo stiffness. State these explicitly in Quality Constraints.
- If people appear (e.g. child sleeping), describe them as natural, unposed, realistic — no exaggerated cuteness, real skin texture.

EXAMPLE STRUCTURE (adapt the content to the product, keep this format):

Create an ultra-realistic nighttime lifestyle photo featuring the exact lamp from the reference image.

The lamp must remain 100% unchanged in shape, size, color, texture, and details.
No redesign, no stylization, no glow exaggeration.

Scene / Environment:
A cozy, modern child's bedroom at night.
Minimal, tasteful decor suited for families with young kids and a higher disposable income.
Natural materials: light wood bed frame, soft neutral bedding (beige, off-white, warm gray).
Calm, uncluttered space — no toys overload.

Lamp Placement & Light:
The lamp is placed on a small wooden bedside table, right next to the bed.
The lamp is turned on, emitting a soft, warm, low-intensity night light glow.
Light should gently illuminate the immediate area only — subtle, comforting, never bright.
No neon glow, no halo, no magical lighting effects.

Child (Very Important):
A young child (toddler or early school age) is sleeping peacefully in bed.
The child's face is partially visible or turned slightly away, eyes closed.
Natural sleeping posture, relaxed hands, no posed or staged look.
No exaggerated cuteness, no perfect symmetry.

Lighting & Mood:
True nighttime lighting.
The room remains mostly dark, with soft shadows.
The lamp provides the main light source, complemented by very faint ambient moonlight through a window (optional, subtle).
Mood: safety, comfort, reassurance, bedtime calm.

Camera & Style:
Professional lifestyle photography.
Shot from adult eye-level or slightly above bedside height.
Shallow depth of field, natural grain, real camera imperfections.

Quality Constraints:
No AI look.
No over-smooth skin.
No plastic textures.
No dreamy fantasy vibe.
No stock-photo stiffness.

The final image must look like a real lifestyle photoshoot for a premium kids lighting brand, taken quietly at night in a real home.

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
    if (text.length >= 200 && /ultra-realistic/i.test(text) && /reference image/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestLifestyleInActionPrompt]', err)
  }

  return FALLBACK_LIFESTYLE_IN_ACTION_PROMPT
}

/** Fallback for 4th image (5-photo flow) when vision fails — lifestyle with product in use by human. */
const FALLBACK_LIFESTYLE_IN_USE_PROMPT = `Ultra-realistic lifestyle product photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign or reinterpret the product.

Scene:
A realistic person is using or holding the product naturally in an appropriate setting. The usage makes sense ergonomically. The setting fits the product category.

Background:
Natural environment appropriate for the product. Clean, believable, high-end brand feel.

Lighting:
Natural or professional lighting. Realistic shadows and falloff. No artificial glow.

Camera:
Professional photography. Realistic depth of field. Shot like a high-end brand campaign.

Style:
Ultra-realistic. Physically believable. Commercially viable. No cinematic fantasy, no AI look, no over-stylization.

Constraints:
Product identical to reference. No cliché influencer vibe. No unrealistic perfection. No exaggerated drama.
Ultra-realistic result indistinguishable from a real professional photoshoot.`

const LIFESTYLE_IN_USE_VISION_PROMPT = `You are an elite commercial art director and product advertising photographer.

You are given a product image.

Your job is to analyze the product (its category, material, size, ergonomics, target user, emotional positioning) and generate ONE premium ultra-realistic lifestyle photography prompt where the product is naturally being used.

The output MUST follow this exact structure and sections:

Scene

Background

Lighting

Camera

Style

Constraints

The result must be:

Ultra-realistic

Physically believable

Commercially viable for high-end e-commerce

Not cinematic fantasy

Not AI-looking

Not over-stylized

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, textures, logos.
Do NOT redesign or reinterpret the product.

Creative Requirements:

The product must be shown in use by a realistic human.

The usage must make sense ergonomically.

The setting must feel natural for the product category.

The emotion must align with likely buyer psychology.

No cliché Instagram influencer vibe.

No unrealistic perfection.

No exaggerated drama.

The scene should feel like a high-end brand campaign shot by a professional photographer.

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
    if (text.length >= 200 && /ultra-realistic/i.test(text) && /reference image|product/i.test(text)) {
      return text
    }
  } catch (err) {
    console.error('[suggestLifestyleInUsePrompt]', err)
  }

  return FALLBACK_LIFESTYLE_IN_USE_PROMPT
}

/** Fallback for 5th image (5-photo flow) when vision fails — non-obvious meaningful context. */
const FALLBACK_NON_OBVIOUS_CONTEXT_PROMPT = `Ultra-realistic advertising photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
The product is placed in a non-obvious but meaningful context. The concept is original and visually striking. It could be photographed in real life.

Background:
Real environment, not a minimal studio. Bold brand campaign feel. Creates curiosity or emotional depth.

Lighting:
Professional photoshoot lighting. Physically possible. Realistic.

Camera:
Professional campaign photography. No fantasy, no sci-fi, no surrealism. Shot as a real photoshoot.

Style:
Ultra-realistic. Physically possible. High-end campaign, not product catalog. No floating, no magic, no abstract art.

Constraints:
Product identical to reference. Not the most obvious usage. Avoid clichés and Pinterest-level ideas. No minimal studio setup.
Ultra-realistic result indistinguishable from a real professional photoshoot.`

const NON_OBVIOUS_CONTEXT_VISION_PROMPT = `You are a world-class advertising creative director working for a premium brand.

You are given a product image.

Your job is to analyze the product deeply (form, material, function, symbolism, target demographic, emotional resonance).

Generate ONE highly original, visually striking, but ultra-realistic photography concept where the product is present in a non-obvious yet meaningful context.

The output MUST follow this exact structure:

Scene

Background

Lighting

Camera

Style

Constraints

The result must be:

Ultra-realistic

Physically possible

Shot as a real professional photoshoot

Not fantasy

Not sci-fi

Not surrealism

No floating magical nonsense

No abstract art installation

The product must remain EXACTLY identical to the reference image:
same shape, proportions, colors, textures, logos.
Do NOT alter or redesign the product.

Creative Requirements:

The idea must NOT be the most obvious usage scenario.

The idea must still make sense conceptually.

It must feel like a bold brand campaign shot.

It should create curiosity or emotional depth.

It must be something that could realistically be photographed in real life.

Avoid clichés.

Avoid Pinterest-level ideas.

Avoid minimal studio setups (this is not a studio shot).

Think high-end campaign photography, not product catalog.

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
    if (text.length >= 200 && /ultra-realistic/i.test(text) && /reference image|product/i.test(text)) {
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
const FALLBACK_CINEMATIC_PRODUCT_IN_USE_PROMPT = `Ultra-realistic cinematic product photography.

The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT alter or redesign the product.

Scene:
The product is shown in use in a striking, cinematic context. Dramatic composition. Film-like storytelling. High production value but still "product in use".

Background:
Atmospheric environment. Could be golden hour, moody interior, or dramatic natural setting. Cinematic depth and layers.

Lighting:
Cinematic lighting. Strong key light, rim light, or backlight. Film-like contrast and color grading. Realistic but dramatic.

Camera:
Shot like a high-end commercial or film. Shallow depth of field. Anamorphic or premium lens feel. Motion or tension where appropriate.

Style:
Cinematic. Cool. Premium. Product in use feels iconic and memorable. No fantasy, no sci-fi — physically possible real-world shoot.

Constraints:
Product identical to reference. Ultra-realistic. Indistinguishable from a real cinematic photoshoot.`

const CINEMATIC_PRODUCT_IN_USE_VISION_PROMPT = `You are a world-class commercial director and cinematographer.

You are given a product image.

Your job is to analyze the product and generate ONE complete image prompt for a cinematic product-in-use shot: really cool, film-like, high production value, with the product in use in a striking way.

The output MUST be a complete prompt ready for an image generation model. Use this structure:

Scene

Background

Lighting

Camera

Style

Constraints

Requirements:
- The result must feel CINEMATIC: dramatic lighting, film-like color grading, premium composition, shallow depth of field, anamorphic or high-end lens feel.
- The product must be shown IN USE (or in a striking in-context moment) — not just on a shelf. Cool, memorable, iconic.
- The product from the reference image must remain EXACTLY identical: same shape, proportions, colors, textures, logos. Do NOT redesign the product.
- Ultra-realistic. Physically possible. No fantasy or sci-fi. As if shot on a real high-end commercial.
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
