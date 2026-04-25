import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product } from "@/lib/types";
import { calcCart } from "@/lib/pricing";
import { generatePaymentReference } from "@/lib/payment";
import { sendPaymentInstructions } from "@/lib/email";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const sale_slug = (formData.get("sale_slug") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const pickup_choice = (formData.get("pickup_choice") as string)?.trim() || null;
  const contactMemberRaw = (formData.get("contact_member_id") as string)?.trim() || null;

  let pickup_slot_id: string | null = null;
  let contact_member_id: string | null = null;
  if (pickup_choice === "courier") {
    contact_member_id = contactMemberRaw;
  } else if (pickup_choice) {
    pickup_slot_id = pickup_choice;
  }

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

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url), 303);
  }

  const { lineItems, totalCents } = calcCart(products, groups, items);

  if (lineItems.length === 0 || totalCents <= 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url), 303);
  }

  // Idempotency guard: same email + sale within last 60s -> reuse the existing order.
  // Catches double-submits, refreshes, and impatient retries.
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await supabase
    .from("orders")
    .select("id, payment_reference")
    .eq("sale_id", sale_id)
    .eq("email", email)
    .gte("created_at", sixtySecondsAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.payment_reference) {
    return NextResponse.redirect(new URL(`/betaling/${recent.payment_reference}`, req.url), 303);
  }

  const payment_reference = generatePaymentReference("BEST");

  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({
      sale_id,
      name,
      email,
      phone,
      items,
      status: "new",
      payment_status: "pending",
      payment_reference,
      contact_member_id,
      pickup_slot_id,
    })
    .select("id")
    .single();

  if (dbError || !order) {
    console.error("Order insert error:", dbError);
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const itemSummary = lineItems
    .map((l) => `${l.quantity}× ${l.name}`)
    .join(", ");

  const { data: sale } = await supabase
    .from("sales")
    .select("name")
    .eq("id", sale_id)
    .single();

  // Fire-and-forget: don't block the redirect on Resend latency.
  // sendPaymentInstructions catches and logs its own errors.
  void sendPaymentInstructions({
    to: email,
    name,
    reference: payment_reference,
    totalCents,
    kind: "order",
    itemSummary,
    contextLabel: sale?.name,
  });

  return NextResponse.redirect(new URL(`/betaling/${payment_reference}`, req.url), 303);
}
