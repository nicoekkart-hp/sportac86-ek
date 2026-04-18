import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = (formData.get("event_id") as string)?.trim();
  const slot_id = (formData.get("slot_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const remarks = (formData.get("remarks") as string) || null;

  if (!event_id || !slot_id || !name || !email) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, location")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();
  if (!event) {
    return NextResponse.json({ error: "Evenement niet gevonden" }, { status: 404 });
  }

  const { data: slot } = await supabase
    .from("event_slots")
    .select("id, event_id, date, max_attendees")
    .eq("id", slot_id)
    .single();
  if (!slot || slot.event_id !== event.id) {
    return NextResponse.json({ error: "Datum niet gevonden" }, { status: 400 });
  }

  const { data: tickets } = await supabase
    .from("event_tickets")
    .select("id, name, price_cents")
    .eq("event_id", event.id);
  const ticketById = new Map((tickets ?? []).map((t) => [t.id, t]));

  // Parse tickets.{id}=qty
  const requested: { ticket_id: string; qty: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^tickets\.([^.]+)$/);
    if (!m) continue;
    const ticket_id = m[1];
    const qty = parseInt(value as string, 10);
    if (!ticket_id || !ticketById.has(ticket_id) || isNaN(qty) || qty <= 0) continue;
    requested.push({ ticket_id, qty });
  }

  if (requested.length === 0) {
    return NextResponse.redirect(new URL(`/agenda/${event.slug}?error=geen_tickets#inschrijven`, req.url), 303);
  }

  const totalPersons = requested.reduce((s, r) => s + r.qty, 0);

  // Capacity guard
  if (slot.max_attendees !== null) {
    const { data: existing } = await supabase
      .from("registrations")
      .select("num_persons")
      .eq("slot_id", slot.id);
    const taken = (existing ?? []).reduce((s, r) => s + (r.num_persons ?? 0), 0);
    if (taken + totalPersons > slot.max_attendees) {
      return NextResponse.redirect(new URL(`/agenda/${event.slug}?error=volzet#inschrijven`, req.url), 303);
    }
  }

  const ticketsJson: Record<string, number> = {};
  for (const r of requested) ticketsJson[r.ticket_id] = r.qty;

  const adminSupabase = createAdminClient();
  const { data: registration, error: dbError } = await adminSupabase
    .from("registrations")
    .insert({
      event_id: event.id,
      slot_id: slot.id,
      name,
      email,
      num_persons: totalPersons,
      remarks,
      tickets: ticketsJson,
      payment_status: "pending",
    })
    .select("id")
    .single();
  if (dbError || !registration) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    line_items: requested.map((r) => {
      const t = ticketById.get(r.ticket_id)!;
      return {
        price_data: {
          currency: "eur",
          product_data: { name: `${event.title} — ${t.name}` },
          unit_amount: t.price_cents,
        },
        quantity: r.qty,
      };
    }),
    mode: "payment",
    customer_email: email,
    metadata: { type: "inschrijving", record_id: registration.id },
    success_url: `${origin}/agenda/${event.slug}?betaald=1`,
    cancel_url: `${origin}/agenda/${event.slug}#inschrijven`,
  });

  return NextResponse.redirect(session.url!, 303);
}
