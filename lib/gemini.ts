import { GoogleGenAI } from '@google/genai'

/** Prompt for turning a product photo into a studio shot (Gemini 3 Pro Image / "nano banana pro"). */
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

/**
 * Generates one studio product image from a reference product photo using Gemini.
 * Returns the generated image as a Buffer (PNG), or null if generation fails.
 */
export async function generateStudioProductImage(
  productImageBuffer: Buffer,
  mimeType: string
): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY or GEMINI_API_KEY')
  }

  const ai = new GoogleGenAI({ apiKey })
  const base64 = productImageBuffer.toString('base64')

  try {
    // Use interactions API for image output (gemini-3-pro-image / “nano banana pro”)
    const interaction = await ai.interactions.create({
      model: 'gemini-3-pro-image-preview',
      input: [
        { type: 'text', text: STUDIO_PRODUCT_PROMPT },
        { type: 'image', data: base64, mime_type: mimeType || 'image/jpeg' },
      ],
      response_modalities: ['image'],
    })

    for (const output of interaction.outputs ?? []) {
      if (output.type === 'image' && output.data) {
        return Buffer.from(output.data, 'base64')
      }
    }
    return null
  } catch {
    return null
  }
}
