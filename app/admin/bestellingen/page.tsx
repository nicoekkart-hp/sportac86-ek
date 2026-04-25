import { createAdminClient } from "@/lib/supabase-admin";
import { calcCart } from "@/lib/pricing";
import { ageBucket } from "@/lib/admin-display";
import { PaymentKpiBar } from "@/components/admin/PaymentKpiBar";
import { OrdersList, type OrderRow } from "./_OrdersList";

const FMT_PICKUP = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long" });
function parseLocalDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

type RawOrder = {
  id: string;
  sale_id: string | null;
  name: string;
  email: string;
  phone: string;
  payment_status: "pending" | "paid" | "failed";
  payment_reference: string | null;
  items: Record<string, number> | null;
  is_delivered: boolean;
  last_reminder_at: string | null;
  reminder_count: number;
  created_at: string;
  sales: { name: string } | null;
  team_members: { name: string } | null;
  pickup_slot: { date: string } | null;
};

export default async function BestellingenPage() {
  const supabase = createAdminClient();

  const [{ data }, { data: products }, { data: groups }, { data: salesList }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, sales(name), team_members!contact_member_id(name), pickup_slot:event_slots!pickup_slot_id(date)")
      .order("created_at", { ascending: false }),
    supabase.from("products").select("*"),
    supabase.from("pack_groups").select("*"),
    supabase.from("sales").select("id, name").order("name"),
  ]);

  const productsBySale = new Map<string, typeof products>();
  for (const p of products ?? []) {
    const list = productsBySale.get(p.sale_id) ?? [];
    list.push(p);
    productsBySale.set(p.sale_id, list);
  }
  const groupsBySale = new Map<string, typeof groups>();
  for (const g of groups ?? []) {
    const list = groupsBySale.get(g.sale_id) ?? [];
    list.push(g);
    groupsBySale.set(g.sale_id, list);
  }
  const productNames = new Map<string, string>((products ?? []).map((p) => [p.id, p.name]));

  const raw: RawOrder[] = (data as RawOrder[] | null) ?? [];

  const orders: OrderRow[] = raw.map((o) => {
    let totalCents = 0;
    let itemSummary = "";
    if (o.sale_id && o.items) {
      const sp = productsBySale.get(o.sale_id) ?? [];
      const sg = groupsBySale.get(o.sale_id) ?? [];
      const cart = calcCart(sp, sg, o.items);
      totalCents = cart.totalCents;
      itemSummary = cart.lineItems
        .map((l) => `${l.quantity}× ${l.name}`)
        .join(", ");
    } else if (o.items) {
      itemSummary = Object.entries(o.items)
        .map(([pid, qty]) => `${qty}× ${productNames.get(pid) ?? "(verwijderd)"}`)
        .join(", ");
    }
    return {
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      paymentStatus: o.payment_status,
      paymentReference: o.payment_reference,
      totalCents,
      itemSummary: itemSummary || "—",
      saleId: o.sale_id,
      saleName: o.sales?.name ?? "Zonder verkoop",
      pickupLabel: o.pickup_slot
        ? FMT_PICKUP.format(parseLocalDate(o.pickup_slot.date))
        : null,
      courierName: o.team_members?.name ?? null,
      isDelivered: o.is_delivered,
      createdAt: o.created_at,
      lastReminderAt: o.last_reminder_at,
      reminderCount: o.reminder_count ?? 0,
    };
  });

  // KPI aggregates
  let paidCents = 0;
  let pendingCents = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  for (const o of orders) {
    if (o.paymentStatus === "paid") paidCents += o.totalCents;
    else if (o.paymentStatus === "pending") {
      pendingCents += o.totalCents;
      pendingCount += 1;
      if (ageBucket(o.createdAt, o.paymentStatus) === "stale") overdueCount += 1;
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Bestellingen</h1>
          <p className="text-gray-sub text-sm mt-1">
            Overzicht van alle bestellingen — openstaande betalingen staan bovenaan.
          </p>
        </div>
      </div>

      <PaymentKpiBar
        paidCents={paidCents}
        pendingCents={pendingCents}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        totalCount={orders.length}
      />

      {orders.length === 0 ? (
        <p className="text-sm text-gray-sub">Nog geen bestellingen.</p>
      ) : (
        <OrdersList orders={orders} sales={salesList ?? []} overdueCount={overdueCount} />
      )}
    </div>
  );
}
