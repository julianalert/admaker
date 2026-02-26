/**
 * Credit packs offered on the credits page. Used by checkout and webhook.
 */
export const CREDIT_PACKS = {
  '50': { credits: 50, amountCents: 2700 },
  '100': { credits: 100, amountCents: 4700 },
  '200': { credits: 200, amountCents: 9700 },
} as const

export type CreditPackId = keyof typeof CREDIT_PACKS

export function getPack(packId: string): { credits: number; amountCents: number } | null {
  const key = packId as CreditPackId
  return CREDIT_PACKS[key] ?? null
}
