# Order Contact Member, Delivery Tracking & Manual Payment Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional contact-member selection to the order form, delivery tracking and manual payment override toggles to the admin orders page.

**Architecture:** One SQL migration adds two columns to `orders`. The `Order` type gains three fields. The sale detail page fetches team members and renders an optional dropdown. The checkout route passes `contact_member_id` to Supabase. The admin orders page joins `team_members` and renders two new toggle buttons per order, backed by two new server actions that follow the existing `toggleOrderStatus` pattern.

**Tech Stack:** Next.js 16.2 App Router, Supabase (createAdminClient), Tailwind CSS v4, TypeScript strict mode, Server Actions.

---

## File Structure

- **Create:** `supabase/migrations/013_orders_contact_delivery.sql` — adds `contact_member_id` FK and `is_delivered` boolean to `orders`
- **Modify:** `lib/types.ts` — adds `contact_member_id`, `contact_member_name?`, `is_delivered` to the `Order` type
- **Modify:** `app/steunen/[slug]/page.tsx` — fetches team members, adds optional contact member `<select>` before submit
- **Modify:** `app/api/checkout/bestelling/route.ts` — reads `contact_member_id` from formData, includes it in the Supabase insert
- **Modify:** `app/admin/bestellingen/page.tsx` — joins `team_members`, shows contact badge, adds payment + delivery toggle buttons
- **Modify:** `app/admin/bestellingen/actions.ts` — adds `togglePaymentStatus` and `toggleDelivered` server actions

---

### Task 1: Database migration

Add `contact_member_id` (nullable FK → `team_members.id`) and `is_delivered boolean default false` to the `orders` table.

**Files:**
- Create: `supabase/migrations/013_orders_contact_delivery.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/013_orders_contact_delivery.sql` with exactly this content:

```sql
alter table orders
  add column contact_member_id uuid references team_members(id) on delete set null,
  add column is_delivered boolean not null default false;
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor → paste the migration SQL → click Run.

Expected: no errors. The `orders` table now has `contact_member_id` (nullable uuid) and `is_delivered` (boolean, default false).

To verify, run in the SQL Editor:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'orders'
  and column_name in ('contact_member_id', 'is_delivered');
```

Expected output: two rows — `contact_member_id` (uuid, YES, null) and `is_delivered` (boolean, NO, false).

- [ ] **Step 3: Commit**

```bash
cd /home/nicoekkart/play/sportac86-ek
git add supabase/migrations/013_orders_contact_delivery.sql
git -c commit.gpgsign=false commit -m "feat(db): add contact_member_id and is_delivered to orders"
```

---

### Task 2: Update the Order type

Add the three new fields to the `Order` type in `lib/types.ts`.

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Replace the Order type**

Open `lib/types.ts`. Find the `Order` type and replace it entirely with:

```ts
export type Order = {
  id: string;
  sale_id: string | null;
  sale_name?: string;
  name: string;
  email: string;
  phone: string;
  items: Record<string, number>;
  pickup_event_id: string | null;
  status: "new" | "handled";
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  contact_member_id: string | null;
  contact_member_name?: string;
  is_delivered: boolean;
  created_at: string;
};
```

Leave all other types (`EventRecord`, `Registration`, `Donation`, `TeamMember`, `Sponsor`, `Product`, `Sale`) completely unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git -c commit.gpgsign=false commit -m "feat(types): add contact_member_id, contact_member_name, is_delivered to Order"
```

---

### Task 3: Sale detail page — contact member dropdown

Fetch all team members server-side and add an optional `<select>` for the buyer to pick a contact member.

**Files:**
- Modify: `app/steunen/[slug]/page.tsx`

- [ ] **Step 1: Read the current file**

Read `app/steunen/[slug]/page.tsx` to understand the current structure before editing.

- [ ] **Step 2: Add TeamMember to the import**

Find the line:
```ts
import { Sale, Product } from "@/lib/types";
```

Replace with:
```ts
import { Sale, Product, TeamMember } from "@/lib/types";
```

- [ ] **Step 3: Add the team members fetch**

After the `productsData` fetch block (the one ending with `const products: Product[] = productsData ?? [];`), add:

```ts
  const { data: membersData } = await supabase
    .from("team_members")
    .select("id, name")
    .order("sort_order");

  const members: Pick<TeamMember, "id" | "name">[] = membersData ?? [];
```

- [ ] **Step 4: Add the contact member select to the form**

Inside the `<form>` element, between the closing `</div>` of the phone field and the `<button type="submit">` element, insert:

```tsx
            <div>
              <label className="block text-sm font-semibold mb-1">
                Wie brengt jouw bestelling?{" "}
                <span className="text-gray-sub font-normal">(optioneel)</span>
              </label>
              <select
                name="contact_member_id"
                defaultValue=""
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
              >
                <option value="">— Geen voorkeur —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "app/steunen/[slug]/page.tsx"
git -c commit.gpgsign=false commit -m "feat(steunen): add optional contact member dropdown to order form"
```

---

### Task 4: Checkout route — persist contact_member_id

Read `contact_member_id` from the posted formData and include it in the Supabase insert.

**Files:**
- Modify: `app/api/checkout/bestelling/route.ts`

- [ ] **Step 1: Read the current file**

Read `app/api/checkout/bestelling/route.ts` to find the exact lines.

- [ ] **Step 2: Add contact_member_id extraction**

After the `phone` extraction line:
```ts
  const phone = (formData.get("phone") as string)?.trim() ?? "";
```

Add:
```ts
  const contact_member_id = (formData.get("contact_member_id") as string)?.trim() || null;
```

- [ ] **Step 3: Include contact_member_id in the insert**

Find the Supabase insert:
```ts
    .insert({ sale_id, name, email, phone, items, status: "new", payment_status: "pending" })
```

Replace with:
```ts
    .insert({ sale_id, name, email, phone, items, status: "new", payment_status: "pending", contact_member_id })
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/checkout/bestelling/route.ts
git -c commit.gpgsign=false commit -m "feat(checkout): persist contact_member_id on order insert"
```

---

### Task 5: Admin server actions — togglePaymentStatus and toggleDelivered

Add two new server actions to `app/admin/bestellingen/actions.ts`.

**Files:**
- Modify: `app/admin/bestellingen/actions.ts`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `app/admin/bestellingen/actions.ts` with:

```ts
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function toggleOrderStatus(id: string, current: "new" | "handled") {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ status: current === "new" ? "handled" : "new" }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}

export async function togglePaymentStatus(id: string, current: "pending" | "paid" | "failed") {
  if (current === "failed") return;
  const supabase = createAdminClient();
  const next = current === "paid" ? "pending" : "paid";
  await supabase.from("orders").update({ payment_status: next }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}

export async function toggleDelivered(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ is_delivered: !current }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/bestellingen/actions.ts
git -c commit.gpgsign=false commit -m "feat(admin): add togglePaymentStatus and toggleDelivered server actions"
```

---

### Task 6: Admin orders page — contact badge + toggle buttons

Update `app/admin/bestellingen/page.tsx` to join `team_members`, show a contact name badge, and add the two new toggle buttons.

**Files:**
- Modify: `app/admin/bestellingen/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `app/admin/bestellingen/page.tsx` with:

```tsx
import { createAdminClient } from "@/lib/supabase-admin";
import { Order } from "@/lib/types";
import { toggleOrderStatus, togglePaymentStatus, toggleDelivered } from "./actions";

type OrderRow = Order & {
  sales: { name: string } | null;
  team_members: { name: string } | null;
};

export default async function BestellingenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, sales(name), team_members!contact_member_id(name)")
    .order("created_at", { ascending: false });
  const orders: OrderRow[] = data ?? [];

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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm">{o.name}</span>
                {o.sales && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm uppercase">
                    {o.sales.name}
                  </span>
                )}
                {o.status === "new" && (
                  <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">
                    Nieuw
                  </span>
                )}
                {o.team_members && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm">
                    📦 {o.team_members.name}
                  </span>
                )}
                {o.is_delivered && (
                  <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-sm">
                    Afgeleverd
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-sub mb-1">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(o.items).map(([productId, qty]) => (
                  <span key={productId} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-sm">
                    {productId} ×{qty}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-sub mt-1.5">
                {new Date(o.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end shrink-0">
              {/* Order status toggle */}
              <form action={toggleOrderStatus.bind(null, o.id, o.status)}>
                <button
                  type="submit"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                    o.status === "new"
                      ? "border-green-500 text-green-700 hover:bg-green-50"
                      : "border-[#e8e4df] text-gray-sub hover:border-gray-400"
                  }`}
                >
                  {o.status === "new" ? "✓ Afgehandeld" : "↩ Opnieuw openen"}
                </button>
              </form>

              {/* Payment status toggle */}
              {o.payment_status === "paid" && (
                <form action={togglePaymentStatus.bind(null, o.id, o.payment_status)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-green-500 text-green-700 hover:bg-green-50 transition-colors"
                  >
                    ✓ Betaald
                  </button>
                </form>
              )}
              {o.payment_status === "pending" && (
                <form action={togglePaymentStatus.bind(null, o.id, o.payment_status)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition-colors"
                  >
                    In afwachting
                  </button>
                </form>
              )}
              {o.payment_status === "failed" && (
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">
                  Mislukt
                </span>
              )}

              {/* Delivery toggle */}
              <form action={toggleDelivered.bind(null, o.id, o.is_delivered)}>
                <button
                  type="submit"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                    o.is_delivered
                      ? "border-[#e8e4df] text-gray-sub hover:border-gray-400"
                      : "border-blue-400 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {o.is_delivered ? "↩ Nog te leveren" : "✓ Afgeleverd"}
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/bestellingen/page.tsx
git -c commit.gpgsign=false commit -m "feat(admin): show contact badge, add payment and delivery toggles on orders page"
```

---

### Task 7: Push

- [ ] **Step 1: Push all commits**

```bash
cd /home/nicoekkart/play/sportac86-ek && git push
```
