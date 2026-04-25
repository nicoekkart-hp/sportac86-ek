import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase";
import { generatePaymentReference } from "@/lib/payment";
import { sendPaymentInstructions } from "@/lib/email";

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

  // Idempotency guard: same email + slot within last 60s -> reuse the existing registration.
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await adminSupabase
    .from("registrations")
    .select("id, payment_reference")
    .eq("slot_id", slot.id)
    .eq("email", email)
    .gte("created_at", sixtySecondsAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.payment_reference) {
    return NextResponse.redirect(new URL(`/betaling/${recent.payment_reference}`, req.url), 303);
  }

  const payment_reference = generatePaymentReference("INS");

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
      payment_reference,
    })
    .select("id")
    .single();
  if (dbError || !registration) {
    console.error("Registration insert error:", dbError);
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const totalCents = requested.reduce((sum, r) => {
    const t = ticketById.get(r.ticket_id)!;
    return sum + t.price_cents * r.qty;
  }, 0);
  const itemSummary = requested
    .map((r) => `${r.qty}× ${ticketById.get(r.ticket_id)!.name}`)
    .join(", ");

  // Fire-and-forget: don't block the redirect on Resend latency.
  void sendPaymentInstructions({
    to: email,
    name,
    reference: payment_reference,
    totalCents,
    kind: "registration",
    itemSummary,
    contextLabel: event.title,
  });

  return NextResponse.redirect(new URL(`/betaling/${payment_reference}`, req.url), 303);
}
