# Sportac 86 Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected admin panel at `/admin` for managing all site content — events, team members, registrations, orders, donations, sponsors, and sponsor requests.

**Architecture:** Supabase Auth (email/password) protects all `/admin/*` routes via a Next.js middleware. The admin UI uses a persistent dark sidebar layout with a white content area. All data mutations go through server actions (Next.js 15+ `"use server"` functions) — no separate API routes needed for admin. The anon Supabase client is used for public reads; a service-role client (env var `SUPABASE_SERVICE_ROLE_KEY`) is used for all admin writes/reads that bypass RLS.

**Tech Stack:** Next.js 16 App Router, Supabase Auth + service-role client, Tailwind CSS v4, TypeScript. No additional UI libraries — plain HTML forms + server actions.

---

## File Map

| File | Purpose |
|---|---|
| `middleware.ts` | Protect `/admin/*` — redirect to `/admin/login` if no session |
| `app/admin/layout.tsx` | Admin shell: sidebar + content area, auth-aware |
| `app/admin/login/page.tsx` | Login form (email + password) |
| `app/admin/login/actions.ts` | Server action: sign in via Supabase Auth |
| `app/admin/page.tsx` | Dashboard — counts of events, registrations, orders, donations |
| `app/admin/evenementen/page.tsx` | Events list with publish toggle |
| `app/admin/evenementen/nieuw/page.tsx` | Create event form |
| `app/admin/evenementen/[id]/page.tsx` | Edit event form |
| `app/admin/evenementen/actions.ts` | Server actions: create, update, delete, toggle publish |
| `app/admin/team/page.tsx` | Team members list |
| `app/admin/team/nieuw/page.tsx` | Add team member form |
| `app/admin/team/[id]/page.tsx` | Edit team member form |
| `app/admin/team/actions.ts` | Server actions: create, update, delete |
| `app/admin/inschrijvingen/page.tsx` | Registrations list grouped by event |
| `app/admin/bestellingen/page.tsx` | Orders list with status toggle |
| `app/admin/bestellingen/actions.ts` | Server action: toggle order status |
| `app/admin/donaties/page.tsx` | Donations list |
| `app/admin/sponsors/page.tsx` | Sponsors list |
| `app/admin/sponsors/nieuw/page.tsx` | Add sponsor form |
| `app/admin/sponsors/[id]/page.tsx` | Edit sponsor form |
| `app/admin/sponsors/actions.ts` | Server actions: create, update, delete |
| `app/admin/sponsor-aanvragen/page.tsx` | Sponsor request inbox (read-only) |
| `lib/supabase-admin.ts` | Service-role Supabase client (server-only) |
| `supabase/migrations/003_admin_rls.sql` | RLS policies for authenticated admin reads/writes |

---

## Task 1: Service-role client + RLS migration

**Files:**
- Create: `lib/supabase-admin.ts`
- Create: `supabase/migrations/003_admin_rls.sql`

- [ ] **Step 1: Create the service-role Supabase client**

Create `lib/supabase-admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

// This file must NEVER be imported from client components.
// It uses the service-role key which bypasses RLS.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- [ ] **Step 2: Create RLS migration for admin access**

Create `supabase/migrations/003_admin_rls.sql`:

```sql
-- Allow authenticated users (admins) to read all rows (including unpublished)
create policy "Admin read events" on events
  for select to authenticated using (true);

create policy "Admin write events" on events
  for all to authenticated using (true) with check (true);

create policy "Admin read registrations" on registrations
  for select to authenticated using (true);

create policy "Admin delete registrations" on registrations
  for delete to authenticated using (true);

create policy "Admin read donations" on donations
  for select to authenticated using (true);

create policy "Admin read orders" on orders
  for select to authenticated using (true);

create policy "Admin write orders" on orders
  for update to authenticated using (true) with check (true);

create policy "Admin write team" on team_members
  for all to authenticated using (true) with check (true);

create policy "Admin write sponsors" on sponsors
  for all to authenticated using (true) with check (true);

create policy "Admin read sponsor_requests" on sponsor_requests
  for select to authenticated using (true);
```

- [ ] **Step 3: Run the migration**

Go to Supabase dashboard → SQL Editor → paste and run `003_admin_rls.sql`.

- [ ] **Step 4: Add service role key to .env.local**

Add to `.env.local` (get value from Supabase dashboard → Settings → API → service_role key):
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Also add to Vercel environment variables (Settings → Environment Variables).

- [ ] **Step 5: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): service-role client and admin RLS policies" -- lib/supabase-admin.ts supabase/migrations/003_admin_rls.sql
```

---

## Task 2: Auth middleware + login page

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/actions.ts`

- [ ] **Step 1: Create middleware to protect /admin routes**

Create `middleware.ts` in the project root:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes (not /admin/login)
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // Read the Supabase session from cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const accessToken = req.cookies.get("sb-access-token")?.value ??
    req.cookies.getAll().find(c => c.name.includes("auth-token"))?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Verify the token
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Create login server action**

Create `app/admin/login/actions.ts`:

```typescript
"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    redirect("/admin/login?error=credentials");
  }

  // Store session in cookie
  const cookieStore = await cookies();
  cookieStore.set("sb-access-token", data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  redirect("/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  redirect("/admin/login");
}
```

- [ ] **Step 3: Create login page**

Create `app/admin/login/page.tsx`:

```typescript
import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen bg-[#1c2b4a] flex items-center justify-center px-4">
      <div className="bg-white rounded-sm w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <span className="font-condensed font-black text-3xl text-red-sportac">S86</span>
          <p className="text-sm text-gray-sub mt-1">Admin paneel</p>
        </div>

        <form action={signIn} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">E-mailadres</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Wachtwoord</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
          <button
            type="submit"
            className="bg-red-sportac text-white font-bold py-2.5 rounded-sm hover:bg-red-600 transition-colors text-sm mt-2"
          >
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create an admin user in Supabase**

Go to Supabase dashboard → Authentication → Users → Add user. Use a real email and a strong password. This is the admin login.

- [ ] **Step 5: Test login flow locally**

```bash
npm run dev
```

Visit http://localhost:3000/admin — should redirect to /admin/login. Submit credentials — should redirect to /admin (404 for now, that's fine).

- [ ] **Step 6: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): auth middleware and login page" -- middleware.ts app/admin/login/page.tsx app/admin/login/actions.ts
```

---

## Task 3: Admin shell layout + dashboard

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create the AdminSidebar component**

Create `components/admin/AdminSidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/login/actions";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/evenementen", label: "Evenementen", icon: "📅" },
  { href: "/admin/team", label: "Team", icon: "👥" },
  { href: "/admin/inschrijvingen", label: "Inschrijvingen", icon: "📋" },
  { href: "/admin/bestellingen", label: "Bestellingen", icon: "🛒" },
  { href: "/admin/donaties", label: "Donaties", icon: "💶" },
  { href: "/admin/sponsors", label: "Sponsors", icon: "🏢" },
  { href: "/admin/sponsor-aanvragen", label: "Sponsor-aanvragen", icon: "📨" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#1c2b4a] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="font-condensed font-black text-xl text-red-sportac">S86</span>
        <span className="text-white/60 text-xs ml-2">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? "bg-red-sportac text-white font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: back to site + logout */}
      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <span>←</span> Naar de site
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white/70 transition-colors text-left"
          >
            <span>⏻</span> Uitloggen
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create the admin layout**

Create `app/admin/layout.tsx`:

```typescript
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f3f0]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create the dashboard page**

Create `app/admin/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [
    { count: eventCount },
    { count: registrationCount },
    { count: orderCount },
    { count: donationCount },
    { count: newOrderCount },
    { count: sponsorRequestCount },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("donations").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("sponsor_requests").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Evenementen", value: eventCount ?? 0, href: "/admin/evenementen", color: "text-red-sportac" },
    { label: "Inschrijvingen", value: registrationCount ?? 0, href: "/admin/inschrijvingen", color: "text-red-sportac" },
    { label: "Bestellingen", value: orderCount ?? 0, href: "/admin/bestellingen", color: "text-red-sportac", badge: newOrderCount ? `${newOrderCount} nieuw` : undefined },
    { label: "Donaties", value: donationCount ?? 0, href: "/admin/donaties", color: "text-red-sportac" },
    { label: "Sponsor-aanvragen", value: sponsorRequestCount ?? 0, href: "/admin/sponsor-aanvragen", color: "text-red-sportac" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Dashboard</h1>
        <p className="text-gray-sub text-sm mt-1">Overzicht van alle campagneactiviteit</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-sm border border-[#e8e4df] p-5 hover:border-red-sportac transition-colors group"
          >
            <div className={`font-condensed font-black text-4xl ${stat.color} leading-none mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-sub">{stat.label}</div>
            {stat.badge && (
              <div className="mt-2 text-[11px] font-bold bg-red-sportac/10 text-red-sportac px-2 py-0.5 rounded-sm inline-block">
                {stat.badge}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-bold text-sm text-gray-sub uppercase tracking-wider mb-3">Snelle acties</h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/evenementen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
            + Evenement aanmaken
          </Link>
          <Link href="/admin/team/nieuw" className="bg-gray-dark text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-black transition-colors">
            + Teamlid toevoegen
          </Link>
          <Link href="/admin/sponsors/nieuw" className="bg-gray-dark text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-black transition-colors">
            + Sponsor toevoegen
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): shell layout, sidebar, and dashboard" -- app/admin/layout.tsx app/admin/page.tsx components/admin/AdminSidebar.tsx
```

---

## Task 4: Evenementen CRUD

**Files:**
- Create: `app/admin/evenementen/page.tsx`
- Create: `app/admin/evenementen/actions.ts`
- Create: `app/admin/evenementen/nieuw/page.tsx`
- Create: `app/admin/evenementen/[id]/page.tsx`

- [ ] **Step 1: Create server actions for events**

Create `app/admin/evenementen/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const supabase = createAdminClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = formData.get("description") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = formData.get("location") as string;
  const price_euros = parseFloat(formData.get("price_euros") as string) || 0;
  const max_attendees = formData.get("max_attendees") ? parseInt(formData.get("max_attendees") as string, 10) : null;
  const image_url = (formData.get("image_url") as string) || null;
  const is_published = formData.get("is_published") === "on";

  const { error } = await supabase.from("events").insert({
    title, slug, description, date, time, location,
    price_cents: Math.round(price_euros * 100),
    max_attendees,
    image_url,
    is_published,
  });

  if (error) {
    console.error("Create event error:", error);
    redirect("/admin/evenementen?error=1");
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  redirect("/admin/evenementen");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createAdminClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = formData.get("description") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = formData.get("location") as string;
  const price_euros = parseFloat(formData.get("price_euros") as string) || 0;
  const max_attendees = formData.get("max_attendees") ? parseInt(formData.get("max_attendees") as string, 10) : null;
  const image_url = (formData.get("image_url") as string) || null;
  const is_published = formData.get("is_published") === "on";

  const { error } = await supabase.from("events").update({
    title, slug, description, date, time, location,
    price_cents: Math.round(price_euros * 100),
    max_attendees,
    image_url,
    is_published,
  }).eq("id", id);

  if (error) {
    console.error("Update event error:", error);
    redirect("/admin/evenementen?error=1");
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${slug}`);
  redirect("/admin/evenementen");
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  redirect("/admin/evenementen");
}

export async function togglePublish(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("events").update({ is_published: !current }).eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
}
```

- [ ] **Step 2: Create events list page**

Create `app/admin/evenementen/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord } from "@/lib/types";
import { togglePublish, deleteEvent } from "./actions";

export default async function EvenementenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("*").order("date");
  const events: EventRecord[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenementen</h1>
          <p className="text-gray-sub text-sm mt-1">{events.length} evenement{events.length !== 1 ? "en" : ""}</p>
        </div>
        <Link href="/admin/evenementen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Nieuw evenement
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {events.length === 0 && (
          <p className="text-gray-sub text-sm">Nog geen evenementen. Maak er een aan.</p>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-gray-dark">{ev.title}</span>
                {ev.is_published ? (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Gepubliceerd</span>
                ) : (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">Concept</span>
                )}
              </div>
              <p className="text-xs text-gray-sub">{ev.date} · {ev.time.slice(0, 5)} · {ev.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={togglePublish.bind(null, ev.id, ev.is_published)}>
                <button type="submit" className="text-xs text-gray-sub border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  {ev.is_published ? "Verbergen" : "Publiceren"}
                </button>
              </form>
              <Link href={`/admin/evenementen/${ev.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteEvent.bind(null, ev.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors"
                  onClick={(e) => { if (!confirm(`"${ev.title}" verwijderen?`)) e.preventDefault(); }}>
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create shared event form component**

Create `app/admin/evenementen/_EventForm.tsx` (note: underscore prefix = not a route):

```typescript
import { EventRecord } from "@/lib/types";

export function EventForm({ event, action }: { event?: EventRecord; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Titel *</label>
          <input type="text" name="title" required defaultValue={event?.title} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Slug *</label>
          <input type="text" name="slug" required defaultValue={event?.slug} placeholder="spaghettiavond-2025" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac font-mono" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving *</label>
        <textarea name="description" required rows={4} defaultValue={event?.description} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Datum *</label>
          <input type="date" name="date" required defaultValue={event?.date} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Uur *</label>
          <input type="time" name="time" required defaultValue={event?.time} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs (€)</label>
          <input type="number" name="price_euros" min={0} step={0.01} defaultValue={event ? event.price_cents / 100 : 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Locatie *</label>
          <input type="text" name="location" required defaultValue={event?.location} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Max. deelnemers</label>
          <input type="number" name="max_attendees" min={1} defaultValue={event?.max_attendees ?? ""} placeholder="Leeglaten = onbeperkt" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Afbeelding URL</label>
        <input type="url" name="image_url" defaultValue={event?.image_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_published" id="is_published" defaultChecked={event?.is_published} className="w-4 h-4 accent-red-500" />
        <label htmlFor="is_published" className="text-sm font-semibold">Gepubliceerd (zichtbaar op de site)</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/evenementen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create new event page**

Create `app/admin/evenementen/nieuw/page.tsx`:

```typescript
import { EventForm } from "../_EventForm";
import { createEvent } from "../actions";

export default function NieuwEvenementPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Nieuw evenement</h1>
      </div>
      <EventForm action={createEvent} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit event page**

Create `app/admin/evenementen/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord } from "@/lib/types";
import { EventForm } from "../_EventForm";
import { updateEvent } from "../actions";

export default async function BewerkenEvenementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).single();

  if (!data) notFound();

  const event = data as EventRecord;
  const action = updateEvent.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenement bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{event.title}</p>
      </div>
      <EventForm event={event} action={action} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): evenementen CRUD" -- app/admin/evenementen/
```

---

## Task 5: Team CRUD

**Files:**
- Create: `app/admin/team/page.tsx`
- Create: `app/admin/team/actions.ts`
- Create: `app/admin/team/nieuw/page.tsx`
- Create: `app/admin/team/[id]/page.tsx`
- Create: `app/admin/team/_TeamForm.tsx`

- [ ] **Step 1: Create team server actions**

Create `app/admin/team/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTeamMember(formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("team_members").insert({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    discipline: (formData.get("discipline") as string) || null,
    bio: (formData.get("bio") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });

  if (error) redirect("/admin/team?error=1");
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}

export async function updateTeamMember(id: string, formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("team_members").update({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    discipline: (formData.get("discipline") as string) || null,
    bio: (formData.get("bio") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);

  if (error) redirect("/admin/team?error=1");
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}

export async function deleteTeamMember(id: string) {
  const supabase = createAdminClient();
  await supabase.from("team_members").delete().eq("id", id);
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}
```

- [ ] **Step 2: Create team list page**

Create `app/admin/team/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { TeamMember } from "@/lib/types";
import { deleteTeamMember } from "./actions";

export default async function TeamPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("team_members").select("*").order("sort_order");
  const members: TeamMember[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Team</h1>
          <p className="text-gray-sub text-sm mt-1">{members.length} leden</p>
        </div>
        <Link href="/admin/team/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Teamlid toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {members.length === 0 && (
          <p className="text-gray-sub text-sm">Nog geen teamleden. Voeg er een toe.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            {m.image_url && (
              <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            )}
            {!m.image_url && (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-sub text-sm flex-shrink-0">
                {m.name[0]}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-dark">{m.name}</div>
              <div className="text-xs text-gray-sub">{m.role}{m.discipline ? ` · ${m.discipline}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/team/${m.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteTeamMember.bind(null, m.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors"
                  onClick={(e) => { if (!confirm(`${m.name} verwijderen?`)) e.preventDefault(); }}>
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create shared team member form**

Create `app/admin/team/_TeamForm.tsx`:

```typescript
import { TeamMember } from "@/lib/types";

const roles = ["Atleet", "Coach", "Begeleider", "Oudercomité"];
const disciplines = ["", "Freestyle", "Speed", "Team", "Dubbel"];

export function TeamForm({ member, action }: { member?: TeamMember; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input type="text" name="name" required defaultValue={member?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Rol *</label>
          <select name="role" required defaultValue={member?.role ?? "Atleet"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Discipline</label>
          <select name="discipline" defaultValue={member?.discipline ?? ""} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {disciplines.map((d) => <option key={d} value={d}>{d || "— geen —"}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input type="number" name="sort_order" min={0} defaultValue={member?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Foto URL</label>
        <input type="url" name="image_url" defaultValue={member?.image_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Bio</label>
        <textarea name="bio" rows={3} defaultValue={member?.bio ?? ""} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/team" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create new + edit team member pages**

Create `app/admin/team/nieuw/page.tsx`:

```typescript
import { TeamForm } from "../_TeamForm";
import { createTeamMember } from "../actions";

export default function NieuwTeamlidPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Teamlid toevoegen</h1>
      </div>
      <TeamForm action={createTeamMember} />
    </div>
  );
}
```

Create `app/admin/team/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { TeamMember } from "@/lib/types";
import { TeamForm } from "../_TeamForm";
import { updateTeamMember } from "../actions";

export default async function BewerkenTeamlidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("team_members").select("*").eq("id", id).single();

  if (!data) notFound();
  const member = data as TeamMember;
  const action = updateTeamMember.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Teamlid bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{member.name}</p>
      </div>
      <TeamForm member={member} action={action} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): team CRUD" -- app/admin/team/
```

---

## Task 6: Inschrijvingen, Bestellingen, Donaties (read + status)

**Files:**
- Create: `app/admin/inschrijvingen/page.tsx`
- Create: `app/admin/bestellingen/page.tsx`
- Create: `app/admin/bestellingen/actions.ts`
- Create: `app/admin/donaties/page.tsx`

- [ ] **Step 1: Create inschrijvingen page**

Create `app/admin/inschrijvingen/page.tsx`:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, Registration } from "@/lib/types";

export default async function InschrijvingenPage() {
  const supabase = createAdminClient();
  const { data: events } = await supabase.from("events").select("*").order("date");
  const { data: registrations } = await supabase.from("registrations").select("*").order("created_at", { ascending: false });

  const eventsMap = new Map((events ?? []).map((e: EventRecord) => [e.id, e]));
  const allRegs: Registration[] = registrations ?? [];

  // Group registrations per event
  const grouped = new Map<string, Registration[]>();
  for (const reg of allRegs) {
    const list = grouped.get(reg.event_id) ?? [];
    list.push(reg);
    grouped.set(reg.event_id, list);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Inschrijvingen</h1>
        <p className="text-gray-sub text-sm mt-1">{allRegs.length} totaal</p>
      </div>

      {allRegs.length === 0 && (
        <p className="text-gray-sub text-sm">Nog geen inschrijvingen.</p>
      )}

      {Array.from(grouped.entries()).map(([eventId, regs]) => {
        const ev = eventsMap.get(eventId);
        const totalPersons = regs.reduce((sum, r) => sum + r.num_persons, 0);
        return (
          <div key={eventId} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bold text-base text-gray-dark">{ev?.title ?? "Onbekend evenement"}</h2>
              <span className="text-xs text-gray-sub">{regs.length} inschrijvingen · {totalPersons} personen</span>
            </div>
            <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4df] text-xs text-gray-sub">
                    <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
                    <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Personen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Opmerkingen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b border-[#e8e4df] last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 text-gray-sub">{r.email}</td>
                      <td className="px-4 py-2.5">{r.num_persons}</td>
                      <td className="px-4 py-2.5 text-gray-sub text-xs">{r.remarks ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-sub text-xs">{new Date(r.created_at).toLocaleDateString("nl-BE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create orders status action**

Create `app/admin/bestellingen/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function toggleOrderStatus(id: string, current: "new" | "handled") {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ status: current === "new" ? "handled" : "new" }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}
```

- [ ] **Step 3: Create bestellingen page**

Create `app/admin/bestellingen/page.tsx`:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";
import { Order } from "@/lib/types";
import { toggleOrderStatus } from "./actions";

const PRODUCT_NAMES: Record<string, string> = {
  mars: "Mars", snickers: "Snickers", twix: "Twix",
  rood: "Rode wijn", wit: "Witte wijn", rose: "Rosé",
};

export default async function BestellingenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  const orders: Order[] = data ?? [];

  const newOrders = orders.filter((o) => o.status === "new");
  const handledOrders = orders.filter((o) => o.status === "handled");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Bestellingen</h1>
        <p className="text-gray-sub text-sm mt-1">{newOrders.length} nieuw · {handledOrders.length} afgehandeld</p>
      </div>

      {orders.length === 0 && <p className="text-gray-sub text-sm">Nog geen bestellingen.</p>}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className={`bg-white border rounded-sm p-4 flex items-start gap-4 ${o.status === "new" ? "border-red-sportac/40" : "border-[#e8e4df]"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{o.name}</span>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm uppercase">{o.type === "candy" ? "Snoep" : "Wijn"}</span>
                {o.status === "new" && <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">Nieuw</span>}
              </div>
              <p className="text-xs text-gray-sub mb-1">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(o.items).map(([productId, qty]) => (
                  <span key={productId} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-sm">
                    {PRODUCT_NAMES[productId] ?? productId} ×{qty}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-sub mt-1.5">{new Date(o.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <form action={toggleOrderStatus.bind(null, o.id, o.status)}>
              <button type="submit" className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${o.status === "new" ? "border-green-500 text-green-700 hover:bg-green-50" : "border-[#e8e4df] text-gray-sub hover:border-gray-400"}`}>
                {o.status === "new" ? "✓ Afgehandeld" : "↩ Opnieuw openen"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create donaties page**

Create `app/admin/donaties/page.tsx`:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";
import { Donation } from "@/lib/types";

export default async function DonattiesPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
  const donations: Donation[] = data ?? [];

  const total = donations.reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Donaties</h1>
        <p className="text-gray-sub text-sm mt-1">
          {donations.length} donaties · <strong className="text-gray-dark">€{(total / 100).toFixed(2).replace(".", ",")}</strong> totaal
        </p>
      </div>

      {donations.length === 0 && <p className="text-gray-sub text-sm">Nog geen donaties.</p>}

      <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e4df] text-xs text-gray-sub">
              <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
              <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
              <th className="text-left px-4 py-2.5 font-semibold">Bedrag</th>
              <th className="text-left px-4 py-2.5 font-semibold">Boodschap</th>
              <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-[#e8e4df] last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{d.name}</td>
                <td className="px-4 py-2.5 text-gray-sub">{d.email}</td>
                <td className="px-4 py-2.5 font-bold text-red-sportac">€{(d.amount_cents / 100).toFixed(2).replace(".", ",")}</td>
                <td className="px-4 py-2.5 text-gray-sub text-xs">{d.message ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-sub text-xs">{new Date(d.created_at).toLocaleDateString("nl-BE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): inschrijvingen, bestellingen, donaties pages" -- app/admin/inschrijvingen/ app/admin/bestellingen/ app/admin/donaties/
```

---

## Task 7: Sponsors CRUD + Sponsor-aanvragen

**Files:**
- Create: `app/admin/sponsors/page.tsx`
- Create: `app/admin/sponsors/actions.ts`
- Create: `app/admin/sponsors/nieuw/page.tsx`
- Create: `app/admin/sponsors/[id]/page.tsx`
- Create: `app/admin/sponsors/_SponsorForm.tsx`
- Create: `app/admin/sponsor-aanvragen/page.tsx`

- [ ] **Step 1: Create sponsor server actions**

Create `app/admin/sponsors/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSponsor(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sponsors").insert({
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    website_url: (formData.get("website_url") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/sponsors?error=1");
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}

export async function updateSponsor(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sponsors").update({
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    website_url: (formData.get("website_url") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/sponsors?error=1");
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}

export async function deleteSponsor(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sponsors").delete().eq("id", id);
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}
```

- [ ] **Step 2: Create sponsors list page**

Create `app/admin/sponsors/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sponsor } from "@/lib/types";
import { deleteSponsor } from "./actions";

const LEVEL_LABELS: Record<string, string> = { gold: "Goud", silver: "Zilver", bronze: "Brons", partner: "Partner" };

export default async function SponsorsAdminPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsors").select("*").order("sort_order");
  const sponsors: Sponsor[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsors</h1>
          <p className="text-gray-sub text-sm mt-1">{sponsors.length} sponsors</p>
        </div>
        <Link href="/admin/sponsors/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Sponsor toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {sponsors.length === 0 && <p className="text-gray-sub text-sm">Nog geen sponsors.</p>}
        {sponsors.map((s) => (
          <div key={s.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{LEVEL_LABELS[s.level]}</span>
              </div>
              {s.website_url && <p className="text-xs text-gray-sub mt-0.5">{s.website_url}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/sponsors/${s.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteSponsor.bind(null, s.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors"
                  onClick={(e) => { if (!confirm(`${s.name} verwijderen?`)) e.preventDefault(); }}>
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create shared sponsor form**

Create `app/admin/sponsors/_SponsorForm.tsx`:

```typescript
import { Sponsor } from "@/lib/types";

const levels = [
  { value: "gold", label: "Goud" },
  { value: "silver", label: "Zilver" },
  { value: "bronze", label: "Brons" },
  { value: "partner", label: "Partner" },
];

export function SponsorForm({ sponsor, action }: { sponsor?: Sponsor; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input type="text" name="name" required defaultValue={sponsor?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Niveau *</label>
          <select name="level" required defaultValue={sponsor?.level ?? "partner"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Website URL</label>
        <input type="url" name="website_url" defaultValue={sponsor?.website_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Logo URL</label>
        <input type="url" name="logo_url" defaultValue={sponsor?.logo_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Volgorde</label>
        <input type="number" name="sort_order" min={0} defaultValue={sponsor?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/sponsors" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create sponsor new + edit pages**

Create `app/admin/sponsors/nieuw/page.tsx`:

```typescript
import { SponsorForm } from "../_SponsorForm";
import { createSponsor } from "../actions";

export default function NieuwSponsorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor toevoegen</h1>
      </div>
      <SponsorForm action={createSponsor} />
    </div>
  );
}
```

Create `app/admin/sponsors/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sponsor } from "@/lib/types";
import { SponsorForm } from "../_SponsorForm";
import { updateSponsor } from "../actions";

export default async function BewerkenSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsors").select("*").eq("id", id).single();
  if (!data) notFound();
  const sponsor = data as Sponsor;
  const action = updateSponsor.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{sponsor.name}</p>
      </div>
      <SponsorForm sponsor={sponsor} action={action} />
    </div>
  );
}
```

- [ ] **Step 5: Create sponsor-aanvragen inbox**

Create `app/admin/sponsor-aanvragen/page.tsx`:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";

type SponsorRequest = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  created_at: string;
};

export default async function SponsorAanvragenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsor_requests").select("*").order("created_at", { ascending: false });
  const requests: SponsorRequest[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Sponsor-aanvragen</h1>
        <p className="text-gray-sub text-sm mt-1">{requests.length} aanvragen</p>
      </div>

      {requests.length === 0 && <p className="text-gray-sub text-sm">Nog geen aanvragen.</p>}

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border border-[#e8e4df] rounded-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-gray-dark mb-0.5">{r.name}</div>
                <a href={`mailto:${r.email}`} className="text-sm text-red-sportac hover:underline">{r.email}</a>
              </div>
              <span className="text-xs text-gray-sub flex-shrink-0">{new Date(r.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            {r.message && (
              <p className="text-sm text-gray-body mt-3 leading-relaxed border-t border-[#e8e4df] pt-3">{r.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git -c commit.gpgsign=false commit -m "feat(admin): sponsors CRUD and sponsor-aanvragen inbox" -- app/admin/sponsors/ app/admin/sponsor-aanvragen/
```

---

## Task 8: Build check + deploy

- [ ] **Step 1: Add SUPABASE_SERVICE_ROLE_KEY to Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key from Supabase → Settings → API

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /home/nicoekkart/play/sportac86-ek
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin master
```

Vercel will auto-deploy. Check the deploy log for any runtime errors.

- [ ] **Step 4: Smoke test admin**

Visit https://sportac86-ek.vercel.app/admin — should redirect to /admin/login.
Log in → dashboard loads with counts.
Create a test event → appears in /agenda (if published).
Add a team member → appears in /team.

- [ ] **Step 5: Final commit if any last-minute fixes**

```bash
git -c commit.gpgsign=false commit -m "chore(admin): production smoke test fixes" -- <changed files>
```

---

## Self-Review

**Spec coverage:**
- ✅ `/admin` protected by auth (middleware + login page)
- ✅ Sidebar navigation
- ✅ Dashboard with counts
- ✅ Events CRUD (create, edit, publish toggle, delete)
- ✅ Team CRUD
- ✅ Registrations read-only grouped by event
- ✅ Orders with status toggle (new → handled)
- ✅ Donations read-only with total
- ✅ Sponsors CRUD
- ✅ Sponsor requests inbox

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:**
- `createAdminClient()` used consistently across all admin server actions and pages ✅
- `EventRecord`, `TeamMember`, `Sponsor`, `Registration`, `Donation`, `Order` imported from `@/lib/types` ✅
- `updateEvent.bind(null, id)` / `updateTeamMember.bind(null, id)` / `updateSponsor.bind(null, id)` — matching signatures in actions files ✅
- `togglePublish(id, current)` / `toggleOrderStatus(id, current)` — matching calls in pages ✅
