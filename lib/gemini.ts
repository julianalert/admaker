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

/** Try one model. maxRetries = 0 means one attempt only; 2 = up to 3 attempts with backoff. */
async function generateWithModel(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  base64: string,
  mime: string,
  maxRetries: number
): Promise<Buffer | null> {
  const maxAttempts = maxRetries + 1
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const interaction = await ai.interactions.create(
        {
          model,
          input: [
            { type: 'text', text: STUDIO_PRODUCT_PROMPT },
            { type: 'image', data: base64, mime_type: mime },
          ],
          response_modalities: ['image'],
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
 */
export async function generateStudioProductImage(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY or GEMINI_API_KEY')
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')
  const mime = mimeType || 'image/jpeg'

  // Gemini 3 often returns 500 right now — try once, then switch to stable model
  let result = await generateWithModel(ai, IMAGE_MODEL_PRIMARY, base64, mime, 0)
  if (result) return result

  console.error(`[${IMAGE_MODEL_PRIMARY}] failed, trying fallback ${IMAGE_MODEL_FALLBACK}`)
  result = await generateWithModel(ai, IMAGE_MODEL_FALLBACK, base64, mime, 2)
  if (result) return result

  throw new Error('Image generation failed. Please try again.')
}
