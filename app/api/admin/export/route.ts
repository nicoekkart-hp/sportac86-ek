import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return false;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  return !!data?.user && !error;
}

function euro(cents: number | null | undefined) {
  if (cents == null) return 0;
  return cents / 100;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const [
    { data: events },
    { data: slots },
    { data: tickets },
    { data: registrations },
    { data: orders },
    { data: donations },
    { data: products },
    { data: sales },
    { data: teamMembers },
    { data: sponsorRequests },
  ] = await Promise.all([
    supabase.from("events").select("id, title"),
    supabase.from("event_slots").select("id, date"),
    supabase.from("event_tickets").select("id, name, price_cents"),
    supabase.from("registrations").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("donations").select("*").order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, price_cents"),
    supabase.from("sales").select("id, name"),
    supabase.from("team_members").select("id, name"),
    supabase.from("sponsor_requests").select("*").order("created_at", { ascending: false }),
  ]);

  const eventsMap = new Map((events ?? []).map((e) => [e.id, e]));
  const slotsMap = new Map((slots ?? []).map((s) => [s.id, s]));
  const ticketsMap = new Map((tickets ?? []).map((t) => [t.id, t]));
  const productsMap = new Map((products ?? []).map((p) => [p.id, p]));
  const salesMap = new Map((sales ?? []).map((s) => [s.id, s]));
  const teamMembersMap = new Map((teamMembers ?? []).map((m) => [m.id, m]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sportac 86 EK Admin";
  wb.created = new Date();

  const styleHeader = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE9483B" },
    };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // Inschrijvingen
  const wsRegs = wb.addWorksheet("Inschrijvingen");
  wsRegs.columns = [
    { header: "Evenement", key: "event", width: 28 },
    { header: "Slot datum", key: "slot", width: 14 },
    { header: "Naam", key: "name", width: 25 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Personen", key: "num_persons", width: 10 },
    { header: "Tickets", key: "tickets", width: 40 },
    { header: "Totaal (€)", key: "total", width: 12, style: { numFmt: "€#,##0.00" } },
    { header: "Opmerkingen", key: "remarks", width: 30 },
    { header: "Betaling", key: "payment_status", width: 12 },
    { header: "Aangemaakt", key: "created_at", width: 20 },
  ];
  (registrations ?? []).forEach((r) => {
    const slot = r.slot_id ? slotsMap.get(r.slot_id) : null;
    let total = 0;
    const breakdown = r.tickets
      ? Object.entries(r.tickets as Record<string, number>)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => {
            const t = ticketsMap.get(id);
            if (t) total += (t.price_cents ?? 0) * qty;
            return `${qty}× ${t?.name ?? "(verwijderd)"}`;
          })
          .join(", ")
      : "";
    wsRegs.addRow({
      event: eventsMap.get(r.event_id)?.title ?? r.event_id,
      slot: slot?.date ?? "",
      name: r.name,
      email: r.email,
      num_persons: r.num_persons,
      tickets: breakdown,
      total: euro(total),
      remarks: r.remarks ?? "",
      payment_status: r.payment_status,
      created_at: r.created_at,
    });
  });
  styleHeader(wsRegs);

  // Bestellingen
  const wsOrders = wb.addWorksheet("Bestellingen");
  wsOrders.columns = [
    { header: "Verkoop", key: "sale", width: 22 },
    { header: "Naam", key: "name", width: 25 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Telefoon", key: "phone", width: 16 },
    { header: "Items", key: "items", width: 50 },
    { header: "Totaal (€)", key: "total", width: 12, style: { numFmt: "€#,##0.00" } },
    { header: "Contactlid", key: "contact", width: 22 },
    { header: "Pickup slot", key: "pickup", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Betaling", key: "payment_status", width: 12 },
    { header: "Afgeleverd", key: "is_delivered", width: 12 },
    { header: "Aangemaakt", key: "created_at", width: 20 },
  ];
  (orders ?? []).forEach((o) => {
    let total = 0;
    const itemsStr = Object.entries((o.items ?? {}) as Record<string, number>)
      .map(([pid, qty]) => {
        const p = productsMap.get(pid);
        if (p) total += (p.price_cents ?? 0) * qty;
        return `${qty}× ${p?.name ?? "(verwijderd)"}`;
      })
      .join(", ");
    const slot = o.pickup_slot_id ? slotsMap.get(o.pickup_slot_id) : null;
    wsOrders.addRow({
      sale: o.sale_id ? salesMap.get(o.sale_id)?.name ?? "" : "",
      name: o.name,
      email: o.email,
      phone: o.phone,
      items: itemsStr,
      total: euro(total),
      contact: o.contact_member_id ? teamMembersMap.get(o.contact_member_id)?.name ?? "" : "",
      pickup: slot?.date ?? "",
      status: o.status,
      payment_status: o.payment_status,
      is_delivered: o.is_delivered ? "ja" : "nee",
      created_at: o.created_at,
    });
  });
  styleHeader(wsOrders);

  // Donaties
  const wsDon = wb.addWorksheet("Donaties");
  wsDon.columns = [
    { header: "Naam", key: "name", width: 25 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Bedrag (€)", key: "amount", width: 12, style: { numFmt: "€#,##0.00" } },
    { header: "Bericht", key: "message", width: 40 },
    { header: "Betaling", key: "payment_status", width: 12 },
    { header: "Aangemaakt", key: "created_at", width: 20 },
  ];
  (donations ?? []).forEach((d) => {
    wsDon.addRow({
      name: d.name,
      email: d.email,
      amount: euro(d.amount_cents),
      message: d.message ?? "",
      payment_status: d.payment_status,
      created_at: d.created_at,
    });
  });
  styleHeader(wsDon);

  // Sponsor-aanvragen
  const wsSpReq = wb.addWorksheet("Sponsor-aanvragen");
  wsSpReq.columns = [
    { header: "Naam", key: "name", width: 25 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Bericht", key: "message", width: 60 },
    { header: "Aangemaakt", key: "created_at", width: 20 },
  ];
  (sponsorRequests ?? []).forEach((r) => wsSpReq.addRow(r));
  styleHeader(wsSpReq);

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sportac86-export-${stamp}.xlsx"`,
    },
  });
}
