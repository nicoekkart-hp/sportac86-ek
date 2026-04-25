import { createAdminClient } from "@/lib/supabase-admin";
import { ageBucket } from "@/lib/admin-display";
import { PaymentKpiBar } from "@/components/admin/PaymentKpiBar";
import { RegistrationsList, type RegRow } from "./_RegistrationsList";
import type { EventRecord, EventSlot, EventTicket, Registration } from "@/lib/types";

export default async function InschrijvingenPage() {
  const supabase = createAdminClient();
  const [{ data: events }, { data: slots }, { data: tickets }, { data: registrations }] =
    await Promise.all([
      supabase.from("events").select("*"),
      supabase.from("event_slots").select("*"),
      supabase.from("event_tickets").select("*"),
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
    ]);

  const eventsMap = new Map((events ?? []).map((e: EventRecord) => [e.id, e]));
  const slotsMap = new Map((slots ?? []).map((s: EventSlot) => [s.id, s]));
  const ticketsMap = new Map((tickets ?? []).map((t: EventTicket) => [t.id, t]));
  const allRegs: Registration[] = registrations ?? [];

  const rows: RegRow[] = allRegs.map((r) => {
    let totalCents = 0;
    let ticketSummary = "—";
    if (r.tickets) {
      const parts: string[] = [];
      for (const [tid, qty] of Object.entries(r.tickets)) {
        if (qty <= 0) continue;
        const t = ticketsMap.get(tid);
        if (!t) {
          parts.push(`${qty}× (verwijderd)`);
          continue;
        }
        totalCents += t.price_cents * qty;
        parts.push(`${qty}× ${t.name}`);
      }
      if (parts.length > 0) ticketSummary = parts.join(", ");
    }
    const slot = r.slot_id ? slotsMap.get(r.slot_id) : null;
    const ev = eventsMap.get(r.event_id);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      numPersons: r.num_persons,
      remarks: r.remarks,
      paymentStatus: r.payment_status,
      paymentReference: r.payment_reference,
      totalCents,
      ticketSummary,
      eventId: r.event_id,
      eventTitle: ev?.title ?? "Onbekend evenement",
      slotDate: slot?.date ?? null,
      createdAt: r.created_at,
      lastReminderAt: r.last_reminder_at,
      reminderCount: r.reminder_count ?? 0,
    };
  });

  let paidCents = 0;
  let pendingCents = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  for (const r of rows) {
    if (r.paymentStatus === "paid") paidCents += r.totalCents;
    else if (r.paymentStatus === "pending" && r.totalCents > 0) {
      pendingCents += r.totalCents;
      pendingCount += 1;
      if (ageBucket(r.createdAt, r.paymentStatus) === "stale") overdueCount += 1;
    }
  }

  const eventOptions = Array.from(eventsMap.values())
    .map((e) => ({ id: e.id, title: e.title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Inschrijvingen</h1>
        <p className="text-gray-sub text-sm mt-1">
          Overzicht van alle inschrijvingen — openstaande betalingen staan bovenaan.
        </p>
      </div>

      <PaymentKpiBar
        paidCents={paidCents}
        pendingCents={pendingCents}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        totalCount={rows.length}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-sub">Nog geen inschrijvingen.</p>
      ) : (
        <RegistrationsList rows={rows} events={eventOptions} overdueCount={overdueCount} />
      )}
    </div>
  );
}
