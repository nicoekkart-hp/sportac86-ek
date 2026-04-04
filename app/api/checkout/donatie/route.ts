import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const amountEuros = parseFloat(formData.get("amount_euros") as string);

  if (!name || !email || isNaN(amountEuros) || amountEuros < 1) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const amount_cents = Math.round(amountEuros * 100);
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Write pending record first
  const supabase = createAdminClient();
  const { data: donation, error: dbError } = await supabase
    .from("donations")
    .insert({ name, email, amount_cents, payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !donation) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "bancontact", "ideal"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Donatie Sportac 86 EK Noorwegen 2026" },
          unit_amount: amount_cents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: email,
    metadata: { type: "donatie", record_id: donation.id },
    success_url: `${origin}/steunen?betaald=donatie`,
    cancel_url: `${origin}/steunen#doneer`,
  });

  return NextResponse.redirect(session.url!, 303);
}
