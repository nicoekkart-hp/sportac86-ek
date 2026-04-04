import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const type = formData.get("type") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";

  if (!name || !email || (type !== "candy" && type !== "wine")) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch active products of this type
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("type", type)
    .eq("is_active", true);

  const productMap = new Map((products ?? []).map((p: Product) => [p.id, p]));

  // Build items map from form data
  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.slice("items.".length);
      if (!productMap.has(productId)) continue;
      const qty = parseInt(value as string, 10);
      if (!isNaN(qty) && qty > 0) items[productId] = qty;
    }
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const sectionType = type === "candy" ? "snoep" : "wijn";

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen#${sectionType}`, req.url));
  }

  // Write pending order
  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({ type, name, email, phone, items, status: "new", payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !order) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  // Build line items for Stripe
  const lineItems = Object.entries(items).map(([productId, qty]) => {
    const product = productMap.get(productId)!;
    return {
      price_data: {
        currency: "eur",
        product_data: { name: product.name },
        unit_amount: product.price_cents,
      },
      quantity: qty,
    };
  });

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    customer_email: email,
    metadata: { type: "bestelling", record_id: order.id },
    success_url: `${origin}/steunen?betaald=${sectionType}`,
    cancel_url: `${origin}/steunen#${sectionType}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
