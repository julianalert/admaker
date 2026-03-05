import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { doOneGenerationStep } from '@/lib/photoshoot-generation-step'

const MAX_CAMPAIGNS_PER_RUN = 5

export const maxDuration = 60

/**
 * Vercel Cron (or external scheduler) calls this to advance any campaign still "generating".
 * Set CRON_SECRET in env and send it as Authorization: Bearer <CRON_SECRET>.
 * Each run processes up to MAX_CAMPAIGNS_PER_RUN campaigns, one image per campaign.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('status', 'generating')
    .order('created_at', { ascending: true })
    .limit(MAX_CAMPAIGNS_PER_RUN)

  if (!campaigns?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let processed = 0
  for (const c of campaigns) {
    const result = await doOneGenerationStep(supabase, c.id, { serviceRefund: true })
    if (result.completed) processed++
    if (result.error) {
      console.error('[cron/continue-photoshoot]', c.id, result.error)
    }
  }

  return NextResponse.json({ ok: true, processed, total: campaigns.length })
}
