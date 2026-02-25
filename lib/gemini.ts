import { GoogleGenAI } from '@google/genai'

/** Prompt for turning a product photo into a studio shot (Nano Banana Pro / gemini-3-pro-image-preview). */
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

const IMAGE_MODEL_PRIMARY = 'gemini-3-pro-image-preview'
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

/** Supported aspect ratios for image generation (must match API). */
const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const
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

const LIFESTYLE_IN_ACTION_VISION_PROMPT = `You are writing a prompt for an image generation model (Nano Banana). The model will receive the product image attached and your text prompt. Your job is to output ONLY the complete prompt text, nothing else — no preamble, no "Here is the prompt", no markdown.

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
      ? { image_config: { aspect_ratio: options.aspectRatio as AspectRatio } }
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
          ...(generationConfig && { generation_config: generationConfig }),
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
 * Tries gemini-3-pro-image-preview first; if it fails, tries gemini-2.5-flash-image.
 * @param format - Aspect ratio for output: "1:1" | "9:16" | "16:9" | "4:3" (default 1:1)
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

  // Gemini 3 often returns 500 right now — try once, then switch to stable model
  let result = await generateWithModel(ai, IMAGE_MODEL_PRIMARY, base64, mime, 0, genOptions)
  if (result) return result

  console.error(`[${IMAGE_MODEL_PRIMARY}] failed, trying fallback ${IMAGE_MODEL_FALLBACK}`)
  result = await generateWithModel(ai, IMAGE_MODEL_FALLBACK, base64, mime, 2, genOptions)
  if (result) return result

  throw new Error('Image generation failed. Please try again.')
}
