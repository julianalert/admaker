# Admaker database migrations

Supabase (PostgreSQL) migrations for campaigns, product photos, and generated ads.

## Schema overview

- **profiles** – Optional app-specific user data (e.g. brand name). `id` = `auth.users.id`.
- **campaigns** – One campaign = one product. User uploads 1+ product photos; app generates 1–30 ads.
  - `status`: `draft` → `generating` → `completed` | `failed`
- **campaign_photos** – Product photos for a campaign. `storage_path` = path in Supabase Storage.
- **ads** – Generated ad creatives per campaign.
  - `status`: `pending` → `generating` → `completed` | `failed`
  - `format`: e.g. `1080x1080`, `1200x628`

Row Level Security (RLS) is enabled so users only see and modify their own campaigns, photos, and ads.

## How to apply

### Option A: Supabase Dashboard

1. Open your project → **SQL Editor**.
2. Run the contents of each migration file in order:
   - `20250223100000_initial_admaker_schema.sql`
   - `20250223100001_rls_policies.sql`

### Option B: Supabase CLI

From the project root:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Storage buckets

Create two buckets in **Storage** in the Supabase dashboard:

1. **product-photos** – Private (or public if you want direct URLs). For uploads in `campaign_photos.storage_path`.
2. **generated-ads** – Same idea for `ads.storage_path`.

Then apply the storage policies so users can only access their own files:

- **Option A (Dashboard):** SQL Editor → run `supabase/migrations/20250223100002_storage_policies.sql`.
- **Option B (CLI):** `npx supabase db push` (includes this migration).

Path rule: store files under `{user_id}/{campaign_id}/...` so the first folder is the user’s ID. The policies allow read/write only when `(storage.foldername(name))[1] = auth.uid()::text`.
