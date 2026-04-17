import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product } from "@/lib/types";
import { calcCart } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const sale_slug = (formData.get("sale_slug") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const contact_member_id = (formData.get("contact_member_id") as string)?.trim() || null;

  if (!sale_id || !sale_slug || !name || !email) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [{ data: productsData }, { data: groupsData }] = await Promise.all([
    supabase.from("products").select("*").eq("sale_id", sale_id).eq("is_active", true),
    supabase.from("pack_groups").select("*").eq("sale_id", sale_id),
  ]);

  const products: Product[] = productsData ?? [];
  const groups: PackGroup[] = groupsData ?? [];
  const productIds = new Set(products.map((p) => p.id));

  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.slice("items.".length);
      if (!productIds.has(productId)) continue;
      const qty = parseInt(value as string, 10);
      if (!isNaN(qty) && qty > 0) items[productId] = qty;
    }
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url));
  }

  const { stripeLines } = calcCart(products, groups, items);

  if (stripeLines.length === 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url));
  }

  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({ sale_id, name, email, phone, items, status: "new", payment_status: "pending", contact_member_id })
    .select("id")
    .single();

  if (dbError || !order) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const lineItems = stripeLines.map((l) => ({
    price_data: {
      currency: "eur",
      product_data: { name: l.name },
      unit_amount: l.unitAmount,
    },
    quantity: l.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    customer_email: email,
    metadata: { type: "bestelling", record_id: order.id },
    success_url: `${origin}/steunen/${sale_slug}?betaald=1`,
    cancel_url: `${origin}/steunen/${sale_slug}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
