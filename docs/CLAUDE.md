# Sportac 86 EK — AI Developer Guide

Fundraising & event management site for Sportac 86 Deinze, a Belgian ropeskipping team competing at the European Championships in Norway.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 — App Router, server components, server actions |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Tailwind CSS v4 — custom theme in `app/globals.css`, **no tailwind.config.ts** |
| Language | TypeScript (strict mode) |
| Deploy | Vercel — auto-deploys from `master` branch |
| Node.js | **≥20.9.0 required** (use `nvm use 20` locally) |

## Critical conventions

### Next.js 16 breaking changes
- **Middleware is now `proxy.ts`** (not `middleware.ts`). Export `proxy`, not `middleware`:
  ```ts
  export async function proxy(req: NextRequest) { ... }
  ```
- **`searchParams` and `params` are Promises** — must be awaited in page components:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  ```
- **`cookies()` from `next/headers` is async** — always `await cookies()` in server actions.
- Dynamic params: `params: Promise<{ id: string }>` — not `{ id: string }`.

### Git commits
Always use `git -c commit.gpgsign=false commit` — GPG signing is not configured.

### Admin vs public Supabase clients
- **Public reads:** `createServerClient()` from `lib/supabase.ts` — uses anon key, respects RLS
- **Admin mutations:** `createAdminClient()` from `lib/supabase-admin.ts` — uses service role key, bypasses RLS
- **Never import `createAdminClient()` in client components** — the service role key would be exposed

### Server actions
All form mutations use `"use server"` functions, not API routes. Pattern:
```ts
"use server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function doSomething(formData: FormData) {
  const supabase = createAdminClient();
  await supabase.from("table").insert({ ... });
  revalidatePath("/admin/section");
  redirect("/admin/section");
}
```

### Forms in server components
Pass server actions directly as the form `action` prop. For update actions that need an ID, use `.bind()`:
```tsx
const action = updateEvent.bind(null, id);
<EventForm action={action} />
```

### Admin auth flow
1. User logs in at `/admin/login` → `signIn()` server action
2. `signIn()` calls `supabase.auth.signInWithPassword()`, stores token in `sb-access-token` cookie (httpOnly, 8h)
3. `proxy.ts` reads that cookie on every `/admin/*` request, verifies with `supabase.auth.getUser(token)`
4. Invalid/missing token → redirect to `/admin/login`
5. Logout → `signOut()` deletes the cookie

## Design tokens

Defined in `app/globals.css` via Tailwind v4 `@theme`:

| Token | Value | Usage |
|---|---|---|
| `text-red-sportac` / `bg-red-sportac` | `#E9483B` | Primary brand color, CTAs, active states |
| `bg-[#1c2b4a]` | `#1c2b4a` | Admin sidebar, dark hero sections |
| `bg-gray-warm` | `#f5f3f0` | Page backgrounds, warm sections |
| `text-gray-dark` | `#1a1a1a` | Primary text |
| `text-gray-body` | `#555555` | Body text |
| `text-gray-sub` | `#888888` | Secondary/muted text |
| `font-condensed` | Barlow Condensed | Headings (bold, italic) |
| `font-sans` | Barlow | Body text |

Heading style: `font-condensed font-black italic text-4xl text-gray-dark`

## Database schema

### Tables

#### `events`
```
id (uuid) | slug (text, unique) | title | description | date | time
location | image_url | max_attendees | price_cents | is_published | created_at
```
- Public can read where `is_published = true`
- Admin can read/write all rows (including drafts)

#### `registrations`
```
id | event_id (→events) | name | email | num_persons | remarks | created_at
```

#### `donations`
```
id | name | email | amount_cents | message | created_at
```

#### `orders`
```
id | type (candy|wine) | name | email | phone
items (jsonb: {productId: qty}) | pickup_event_id | status (new|handled) | created_at
```

#### `team_members`
```
id | name | role | discipline | bio | image_url | sort_order | created_at
```
- `role`: "Atleet" | "Coach" | "Begeleider" | "Oudercomité"
- `discipline`: "Freestyle" | "Speed" | "Team" | "Dubbel" | null

#### `sponsors`
```
id | name | logo_url | website_url | level (gold|silver|bronze|partner) | sort_order | created_at
```

#### `sponsor_requests`
```
id | name | email | message | created_at
```

### RLS summary
- Public **insert** only: `registrations`, `donations`, `orders`, `sponsor_requests`
- Public **read** only: `events` (published), `team_members`, `sponsors`
- Admin (authenticated): full access to everything via `003_admin_rls.sql`

### Adding a migration
Create `supabase/migrations/NNN_description.sql`, then run it manually in the Supabase dashboard → SQL Editor.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only, never expose to client |
| `EK_DATE` | Yes | ISO date for countdown, e.g. `2026-08-10T09:00:00` |

Set in `.env.local` locally and in Vercel → Settings → Environment Variables.

## File map

```
app/
├── layout.tsx              Root layout — fonts, PublicShell wrapper
├── page.tsx                Homepage
├── agenda/
│   ├── page.tsx            Events list (public)
│   └── [slug]/page.tsx     Event detail + registration form
├── team/page.tsx
├── onze-reis/page.tsx
├── steunen/page.tsx        Donations + orders
├── sponsors/page.tsx       Sponsor list + request form
├── admin/
│   ├── layout.tsx          Admin shell (sidebar + main)
│   ├── page.tsx            Dashboard with counts
│   ├── login/
│   │   ├── page.tsx
│   │   └── actions.ts      signIn(), signOut()
│   ├── evenementen/
│   │   ├── page.tsx        List
│   │   ├── nieuw/page.tsx  Create
│   │   ├── [id]/page.tsx   Edit
│   │   ├── _EventForm.tsx  Shared form (server component)
│   │   └── actions.ts      createEvent(), updateEvent(), deleteEvent(), togglePublish()
│   ├── team/               Same pattern as evenementen
│   ├── sponsors/           Same pattern as evenementen
│   ├── inschrijvingen/page.tsx
│   ├── bestellingen/
│   │   ├── page.tsx
│   │   └── actions.ts      toggleOrderStatus()
│   ├── donaties/page.tsx
│   └── sponsor-aanvragen/page.tsx
└── api/
    ├── registrations/route.ts
    ├── donations/route.ts
    ├── orders/route.ts
    ├── sponsor-request/route.ts
    └── agenda.ics/route.ts

components/
├── Nav.tsx                 Fixed top nav (client — mobile menu state)
├── PublicShell.tsx         Client wrapper — hides Nav/Footer on /admin/*
├── Footer.tsx
├── Countdown.tsx           Client — countdown timer to EK_DATE
├── TeamCard.tsx
├── EventRow.tsx
├── SupportTile.tsx
├── ScrollToSection.tsx
└── admin/
    └── AdminSidebar.tsx    Client — uses usePathname() for active state

lib/
├── types.ts                EventRecord, Registration, Donation, Order, TeamMember, Sponsor
├── supabase.ts             createServerClient() — anon key
├── supabase-admin.ts       createAdminClient() — service role key
├── format.ts               formatPrice(cents) → "€15,00"
└── ics.ts                  generateICS(events) → iCalendar string

supabase/migrations/
├── 001_initial.sql         All tables + public RLS
├── 002_sponsor_requests.sql
└── 003_admin_rls.sql       Admin read/write policies

proxy.ts                    Auth middleware — protects /admin/*
next.config.ts              Remote image domains (** allowed)
```

## Common tasks

### Add a new admin section
1. Create `app/admin/[section]/page.tsx` — fetch data with `createAdminClient()`
2. Create `app/admin/[section]/actions.ts` — server actions with `"use server"`
3. Add nav item in `components/admin/AdminSidebar.tsx`
4. Add RLS policy in a new migration if needed

### Add a new public page
1. Create `app/[route]/page.tsx`
2. Fetch public data with `createServerClient()` from `lib/supabase.ts`
3. No auth required — public pages use the anon key + RLS

### Add a new DB column
1. Write migration: `supabase/migrations/NNN_description.sql`
2. Run it in Supabase dashboard SQL Editor
3. Update the relevant type in `lib/types.ts`
4. Update the form component and server action

### Change the EK countdown date
Update `EK_DATE` env var in `.env.local` and Vercel. Format: `2026-08-10T09:00:00`.

### Allow a new image domain
Update `next.config.ts` → `images.remotePatterns`. Currently `**` allows all HTTPS domains.
