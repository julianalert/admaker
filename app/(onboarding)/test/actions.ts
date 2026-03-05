'use server'

import {
  generateStudioProductImage,
  suggestBackgroundColor,
  studioPromptWithBackground,
  suggestLifestyleInterior,
  lifestylePromptWithInterior,
  suggestLifestyleInActionPrompt,
  suggestLifestyleInUsePrompt,
  suggestNonObviousContextPrompt,
  suggestUgcStylerPrompt,
  suggestCinematicProductInUsePrompt,
  suggestMacroDetailPrompt,
  suggestSocialHookPrompt,
} from '@/lib/gemini'

const MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024 // 4MB

function validateImageBuffer(buffer: Buffer): { ok: true; mimeType: string } | { error: string } {
  if (buffer.length < 12) return { error: 'File is too small to be a valid image' }
  if (buffer.length > MAX_PHOTO_SIZE_BYTES) return { error: `Image must be under ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024}MB` }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ok: true, mimeType: 'image/jpeg' }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { ok: true, mimeType: 'image/png' }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return { ok: true, mimeType: 'image/webp' }
  return { error: 'Invalid image. Use JPEG, PNG, or WebP.' }
}

const IMAGE_TYPES = ['studio', 'studio_2', 'contextual', 'lifestyle', 'creative', 'ugc_styler', 'cinematic', 'macro_detail', 'social_hook'] as const
const FORMATS = ['1:1', '9:16', '16:9', '4:3', '4:5', '5:4'] as const

export type TestImageResult = { error: string } | { imageBase64: string }

export async function generateTestImage(formData: FormData): Promise<TestImageResult> {
  const photo = formData.get('photo') as File | null
  if (!photo || !(photo instanceof File)) return { error: 'Please upload one product photo' }

  const typeRaw = (formData.get('type') as string) || 'studio'
  const type = IMAGE_TYPES.includes(typeRaw as (typeof IMAGE_TYPES)[number]) ? typeRaw : 'studio'
  const formatRaw = (formData.get('format') as string) || '9:16'
  const format = FORMATS.includes(formatRaw as (typeof FORMATS)[number]) ? formatRaw : '9:16'

  const photoBuffer = Buffer.from(await photo.arrayBuffer())
  const validated = validateImageBuffer(photoBuffer)
  if ('error' in validated) return { error: validated.error }
  const { mimeType } = validated

  try {
    let prompt: string

    switch (type) {
      case 'studio': {
        const bg = await suggestBackgroundColor(photoBuffer, mimeType)
        prompt = studioPromptWithBackground(bg)
        break
      }
      case 'studio_2': {
        const interior = await suggestLifestyleInterior(photoBuffer, mimeType)
        prompt = lifestylePromptWithInterior(interior)
        break
      }
      case 'contextual':
        prompt = await suggestLifestyleInActionPrompt(photoBuffer, mimeType)
        break
      case 'lifestyle':
        prompt = await suggestLifestyleInUsePrompt(photoBuffer, mimeType)
        break
      case 'creative':
        prompt = await suggestNonObviousContextPrompt(photoBuffer, mimeType)
        break
      case 'ugc_styler':
        prompt = await suggestUgcStylerPrompt(photoBuffer, mimeType)
        break
      case 'cinematic':
        prompt = await suggestCinematicProductInUsePrompt(photoBuffer, mimeType)
        break
      case 'macro_detail':
        prompt = await suggestMacroDetailPrompt(photoBuffer, mimeType)
        break
      case 'social_hook':
        prompt = await suggestSocialHookPrompt(photoBuffer, mimeType)
        break
      default:
        return { error: 'Unknown image type' }
    }

    const buffer = await generateStudioProductImage([{ buffer: photoBuffer, mimeType }], { format, prompt })
    return { imageBase64: buffer.toString('base64') }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Image generation failed' }
  }
}
