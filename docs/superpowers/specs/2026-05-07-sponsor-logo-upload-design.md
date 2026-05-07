# Sponsor logo upload — design

## Goal

Let admins upload a sponsor logo file from the sponsor form, instead of being forced to provide an external URL. The existing URL field stays as an optional fallback.

## Approach

Mirror the existing pattern used by `app/admin/team/actions.ts` (`resolveImageUrl`), which is also used by `app/admin/producten/actions.ts` and `app/admin/evenementen/actions.ts`. No new abstractions — this is a small, repeated pattern that's clear when read inline.

## Changes

### 1. Migration: `supabase/migrations/028_sponsor_logos_storage.sql`

Create a public `sponsor-logos` bucket with the same RLS policies as `gallery` / `team-photos`:

- Public select on `bucket_id = 'sponsor-logos'`
- Authenticated insert / update / delete on the same

### 2. `app/admin/sponsors/actions.ts`

Add a `resolveLogoUrl(formData)` helper at module top, matching team's `resolveImageUrl`:

- Read `logo_file` from FormData.
- If file present and size > 0, upload to `sponsor-logos` bucket with timestamped filename (`${Date.now()}.${ext}`), `upsert: true`, return `getPublicUrl(...)`.
- On upload error, fall through to the URL field (same as team).
- Otherwise, return `formData.get("logo_url")` or null.

Call `resolveLogoUrl(formData)` in `createSponsor` and `updateSponsor` to populate `logo_url`.

### 3. `app/admin/sponsors/_SponsorForm.tsx`

- Add a "Logo bestand" file input (`name="logo_file"`, `accept="image/*"`).
- Keep existing "Logo URL" input as fallback (label clarifies it's optional / used if no file uploaded).
- If `sponsor?.logo_url` exists, show a small preview thumbnail above the inputs.
- The form already submits via server action — Next.js handles `multipart/form-data` automatically when a `File` input is present, no `encType` change required.

### 4. No type or schema changes

`sponsors.logo_url` (text) already stores the resolved URL regardless of source.

## Out of scope

- Deleting old uploaded logos when replaced (matches team behavior — orphaned files stay in the bucket).
- Image resizing / optimization beyond what `next/image` already does on render.
- Migrating existing external `logo_url` values to the bucket.

## Testing

- Manual: upload a PNG via the form, confirm sponsor appears on `/sponsors` with the uploaded image.
- Manual: leave file empty + provide URL, confirm URL is used.
- Manual: edit existing sponsor, upload new file, confirm `logo_url` updates.
