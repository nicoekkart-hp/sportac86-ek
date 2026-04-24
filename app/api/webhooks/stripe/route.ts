import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { type, record_id } = session.metadata ?? {};

    if (!type || !record_id) {
      console.error("Missing metadata in session:", session.id);
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    if (type === "bestelling") {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("id", record_id);
    } else if (type === "inschrijving") {
      await supabase
        .from("registrations")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("id", record_id);
    }
  }

  return NextResponse.json({ ok: true });
}
