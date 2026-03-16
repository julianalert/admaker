export const metadata = {
  title: 'Admin — All Campaigns',
}

import { format } from 'date-fns'
import { createServiceRoleClient } from '@/lib/supabase/service'
import PhotosCell from './photos-cell'

const PRODUCT_PHOTOS_BUCKET = 'product-photos'
const GENERATED_ADS_BUCKET = 'generated-ads'
const SIGNED_URL_EXPIRY = 3600

type CampaignRow = {
  id: string
  name: string | null
  product_name: string | null
  status: string
  created_at: string
  user_id: string
  brandName: string | null
  userEmail: string | null
  photoUrls: string[]
  adUrls: string[]
}

async function getAllCampaigns(): Promise<CampaignRow[]> {
  const supabase = createServiceRoleClient()

  // Fetch all campaigns with their brand name and product photos
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      product_name,
      status,
      created_at,
      user_id,
      brands(name),
      campaign_photos(storage_path, order_index)
    `)
    .order('created_at', { ascending: false })

  if (error || !campaigns?.length) return []

  const campaignIds = campaigns.map((c) => c.id)

  // Fetch all generated ads for all campaigns in one query
  const { data: allAds } = await supabase
    .from('ads')
    .select('campaign_id, storage_path, created_at')
    .in('campaign_id', campaignIds)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })

  // Fetch user emails from auth.users via the admin API
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailByUserId = new Map<string, string>()
  for (const u of users ?? []) {
    emailByUserId.set(u.id, u.email ?? '')
  }

  // Collect all product photo paths to batch sign
  const allPhotoPaths: string[] = []
  for (const c of campaigns) {
    const photos = (c.campaign_photos ?? []) as { storage_path: string; order_index: number }[]
    for (const p of photos) allPhotoPaths.push(p.storage_path)
  }

  // Collect all generated-ad paths to batch sign
  const allAdPaths: string[] = (allAds ?? []).map((a) => a.storage_path as string)

  // Batch sign both buckets in parallel
  const [signedPhotos, signedAds] = await Promise.all([
    allPhotoPaths.length > 0
      ? supabase.storage.from(PRODUCT_PHOTOS_BUCKET).createSignedUrls(allPhotoPaths, SIGNED_URL_EXPIRY)
      : { data: [] },
    allAdPaths.length > 0
      ? supabase.storage.from(GENERATED_ADS_BUCKET).createSignedUrls(allAdPaths, SIGNED_URL_EXPIRY)
      : { data: [] },
  ])

  const signedPhotoByPath = new Map<string, string>()
  for (const s of signedPhotos.data ?? []) {
    if (s.signedUrl) signedPhotoByPath.set(s.path, s.signedUrl)
  }

  const signedAdByPath = new Map<string, string>()
  for (const s of signedAds.data ?? []) {
    if (s.signedUrl) signedAdByPath.set(s.path, s.signedUrl)
  }

  // Group ads by campaign_id
  const adsByCampaign = new Map<string, string[]>()
  for (const ad of allAds ?? []) {
    const url = signedAdByPath.get(ad.storage_path as string)
    if (!url) continue
    const list = adsByCampaign.get(ad.campaign_id) ?? []
    list.push(url)
    adsByCampaign.set(ad.campaign_id, list)
  }

  // Build result
  return campaigns.map((c) => {
    const photos = (c.campaign_photos ?? []) as { storage_path: string; order_index: number }[]
    const sorted = [...photos].sort((a, b) => a.order_index - b.order_index)
    const photoUrls = sorted
      .map((p) => signedPhotoByPath.get(p.storage_path) ?? '')
      .filter(Boolean)

    const brand = Array.isArray(c.brands) ? c.brands[0] : c.brands
    return {
      id: c.id,
      name: c.name,
      product_name: c.product_name,
      status: c.status,
      created_at: c.created_at,
      user_id: c.user_id,
      brandName: (brand as { name?: string } | null)?.name ?? null,
      userEmail: emailByUserId.get(c.user_id) ?? null,
      photoUrls,
      adUrls: adsByCampaign.get(c.id) ?? [],
    }
  })
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  generating: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default async function AdminPage() {
  const campaigns = await getAllCampaigns()

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} across all users
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Date</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">User</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Campaign</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Product</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Product Photos</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Generated Ads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {format(new Date(c.created_at), 'd MMM yyyy')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{c.brandName ?? '—'}</div>
                      {c.userEmail && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.userEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={`/photoshoot/${c.id}`}
                        className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.name ?? 'Untitled'}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{c.product_name ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <PhotosCell photoUrls={c.photoUrls} campaignId={c.id} />
                    </td>
                    <td className="px-5 py-4">
                      <PhotosCell photoUrls={c.adUrls} campaignId={`${c.id}-ads`} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
