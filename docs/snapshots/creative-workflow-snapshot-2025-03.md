# Creative Director (Brand Photoshoot) workflow — snapshot March 2025

This document is a snapshot of the **Creative Director** workflow before introducing **Product Photoshoot** (ex–Ultra realistic) as a separate mode using the same pipeline. Use it to compare or restore behavior.

## Source files (at snapshot time)

- **Prompts and strategy:** `lib/gemini.ts`  
  - `CREATIVE_DIRECTOR_GUIDELINES`  
  - `formatBrandDnaForCreativeDirector()`  
  - `CREATIVE_STRATEGY_SYSTEM`  
  - `SHOT_PROMPTS_SYSTEM(briefJson, photoCount, clientGuidelines?)`  
  - `createCreativeStrategyBrief(productImages, { photoCount: 5|9, brandDnaProfile, clientGuidelines? })`  
  - `createShotPromptsFromBrief(productImages, brief, { photoCount, clientGuidelines? })`  
  - `getCreativeDirectorShootFallback(productImageBuffer, mimeType, { photoCount: 5|9 })`
- **Generation step:** `lib/photoshoot-generation-step.ts`  
  - For `mode === 'creative'`: fetch brand_dna by campaign.brand_id → createCreativeStrategyBrief (with brandDnaProfile + clientGuidelines) → createShotPromptsFromBrief (or getCreativeDirectorShootFallback) → persist creative_shot_prompts; then generate one image per step using generateStudioProductImage.

## Generation options (creative mode)

```ts
type GenerationOptions =
  | { mode: 'creative'; format: string; photoCount: 5 | 9; quality: '2K' | '4K'; clientGuidelines?: string }
  | { mode: 'ultra'; format: string; photoCount: 3 | 5 | 7 | 9; quality: '2K' | '4K' }
  | { mode: 'single'; ... }
```

## Flow (creative only)

1. Campaign has `generation_options.mode === 'creative'`, `photoCount` 5 or 9, optional `clientGuidelines`.
2. Load product images from `campaign_photos` + storage.
3. If `creative_shot_prompts` is empty:
   - Fetch `brand_dna.profile` for `campaign.brand_id`.
   - Call `createCreativeStrategyBrief(productImages, { photoCount, brandDnaProfile, clientGuidelines })` → brief (visualWorld + shotList).
   - Optionally persist `creative_brief` on campaign.
   - Call `createShotPromptsFromBrief(productImages, brief, { photoCount, clientGuidelines })` or, on failure, `getCreativeDirectorShootFallback(firstImage, mimeType, { photoCount })` → shots.
   - Persist `creative_shot_prompts` on campaign.
4. For each shot index: reserve ad row (generation_index), generate image via `generateStudioProductImage(productImages, { format, prompt: shot.prompt, quality })`, upload, update ad. Repeat until currentCount >= shots.length then set campaign status completed.

## UI (at snapshot time)

- **New photoshoot page** (`app/(onboarding)/new/new-form.tsx`):  
  - Card "Creative Director" (later renamed to "Brand Photoshoot").  
  - Card "Ultra realistic photoshoot" hidden by default (`SHOW_ULTRA_REALISTIC = false`).  
  - When Creative selected: photo count 5|9, format, quality, optional "Your guidelines" (clientGuidelines) textarea.  
  - Action: `createCampaignWithStudioPhoto(formData)` for creative.

## Prompt text references

- **CREATIVE_STRATEGY_SYSTEM:** "You are a senior Creative Director for a premium brand. You are given one or more reference product images (different angles/views of the same product) and optional Brand DNA. Your task is to create a complete Creative Strategy & Brief..."
- **User message for brief:** `Brand DNA:\n${brandDnaText}${clientBlock}\n\nNumber of shots to plan: ${options.photoCount}\n\nYou have been given ${productImages.length} product image(s). Create the Creative Strategy & Brief (JSON only).`
- **SHOT_PROMPTS_SYSTEM:** Includes CREATIVE_DIRECTOR_GUIDELINES, optional CLIENT'S GUIDELINES block, mandatory six-section structure (Scene, Background, Lighting, Camera, Style, Constraints), and "Creative Strategy & Brief (follow this for every shot):" + briefJson.

Full prompt strings live in `lib/gemini.ts`; this snapshot documents structure and flow for comparison after adding Product Photoshoot and renaming Creative Director to Brand Photoshoot.

---

## Changes made after this snapshot

- **Product Photoshoot** (mode `ultra`) was reactivated in the UI and now uses the **exact same workflow** as Brand Photoshoot: same pipeline including Brand DNA (`createCreativeStrategyBrief` with `brandDnaProfile` from campaign’s brand), client guidelines, and 5 or 9 photos.
- **Creative Director** was renamed to **Brand Photoshoot** in the UI.
- **Ultra realistic** was renamed to **Product Photoshoot** in the UI.
- `getUltraRealisticShoot` is no longer used by the generation step; it remains in `lib/gemini.ts` for reference.
