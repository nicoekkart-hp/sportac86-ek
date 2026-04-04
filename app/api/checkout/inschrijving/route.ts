import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = (formData.get("event_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const num_persons = parseInt(formData.get("num_persons") as string, 10);
  const remarks = (formData.get("remarks") as string) || null;

  if (!event_id || !name || !email || isNaN(num_persons) || num_persons < 1) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, price_cents, max_attendees")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Evenement niet gevonden" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Write pending registration
  const adminSupabase = createAdminClient();
  const { data: registration, error: dbError } = await adminSupabase
    .from("registrations")
    .insert({ event_id, name, email, num_persons, remarks, payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !registration) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: event.title },
          unit_amount: event.price_cents,
        },
        quantity: num_persons,
      },
    ],
    mode: "payment",
    customer_email: email,
    metadata: { type: "inschrijving", record_id: registration.id },
    success_url: `${origin}/agenda/${event.slug}?betaald=1`,
    cancel_url: `${origin}/agenda/${event.slug}#inschrijven`,
  });

  return NextResponse.redirect(session.url!, 303);
}
