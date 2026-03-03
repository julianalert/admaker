# Photoshoot creation – current status

## How it works **right now** (after your undo)

- **File:** Only `lib/gemini.ts` exists. **`lib/gemini.prompts-snapshot.ts` was deleted** when you undid.
- **Flow:** **Creative director**
  - User picks **5 or 9 photos** (no 3 or 7).
  - One Gemini vision call (`planCreativeDirectorShoot`) plans the whole shoot and returns N prompts with labels.
  - If that fails, fallback (`getCreativeDirectorShootFallback`) builds N prompts using the per-slot `suggest*` functions.
  - Then each of the N prompts is sent to the image model one by one; images are uploaded and saved with the CD’s `ad_type` labels.
- **Imports:** `app/(onboarding)/new/actions.ts` imports from **`@/lib/gemini`** (planCreativeDirectorShoot, getCreativeDirectorShootFallback, generateStudioProductImage).

## Two flows we had

| Flow | Photo counts | How prompts are chosen | Used when |
|------|--------------|------------------------|-----------|
| **Creative director** | 5, 9 | One CD call returns all N prompts (with labels). Fallback = per-slot suggest* | **Current** (after undo). |
| **Old per-slot** | 3, 5, 7, 9 | No CD. For each image we call a specific suggest* (e.g. suggestBackgroundColor → studio, suggestLifestyleInterior → studio_2, suggestLifestyleInActionPrompt → contextual, …). | What you wanted when using the “snapshot”. |

## Snapshot file

- **gemini.prompts-snapshot.ts** was a **copy of the prompts + per-slot logic only** (no creative director). It’s meant as a saved/reference version you can point the app to for the **old per-slot flow**.
- It was removed when the snapshot was deleted by your undo. It has been recreated (see below) so you have the file again.

## What was recreated

- **`lib/gemini.prompts-snapshot.ts`** has been recreated as a copy of `lib/gemini.ts` **without** the creative director block. So it contains:
  - All current prompts (studio, lifestyle, cinematic, UGC, macro, social hook, etc.)
  - All `suggest*` functions and `generateStudioProductImage`
  - No `planCreativeDirectorShoot` or `getCreativeDirectorShootFallback`

So right now:

- **Creating a photoshoot** still uses **`lib/gemini.ts`** with the **creative director** (5 or 9 photos).
- **`lib/gemini.prompts-snapshot.ts`** exists again as a “prompts-only” module you can use later (e.g. to switch back to the old per-slot flow by changing actions to import from the snapshot and use the old 3/5/7/9 per-slot logic).
