"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { calcCart } from "@/lib/pricing";
import { sendPaymentConfirmation } from "@/lib/email";

export async function toggleOrderStatus(id: string, current: "new" | "handled") {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ status: current === "new" ? "handled" : "new" }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}

export async function togglePaymentStatus(id: string, current: "pending" | "paid" | "failed") {
  if (current === "failed") return;
  const supabase = createAdminClient();
  const next = current === "paid" ? "pending" : "paid";
  await supabase.from("orders").update({ payment_status: next }).eq("id", id);

  if (next === "paid") {
    const { data: order } = await supabase
      .from("orders")
      .select("name, email, items, sale_id, payment_reference, sales(name)")
      .eq("id", id)
      .single<{
        name: string;
        email: string;
        items: Record<string, number> | null;
        sale_id: string | null;
        payment_reference: string | null;
        sales: { name: string } | null;
      }>();

    if (order && order.email && order.payment_reference && order.sale_id) {
      const [{ data: products }, { data: groups }] = await Promise.all([
        supabase.from("products").select("*").eq("sale_id", order.sale_id),
        supabase.from("pack_groups").select("*").eq("sale_id", order.sale_id),
      ]);
      const { totalCents, lineItems } = calcCart(products ?? [], groups ?? [], order.items ?? {});
      const itemSummary = lineItems.map((l) => `${l.quantity}× ${l.name}`).join(", ");
      await sendPaymentConfirmation({
        to: order.email,
        name: order.name,
        reference: order.payment_reference,
        totalCents,
        kind: "order",
        contextLabel: order.sales?.name,
        itemSummary,
      });
    }
  }

  revalidatePath("/admin/bestellingen");
}

export async function toggleDelivered(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ is_delivered: !current }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}

export async function deleteOrder(id: string) {
  const supabase = createAdminClient();
  await supabase.from("orders").delete().eq("id", id).in("payment_status", ["pending", "failed"]);
  revalidatePath("/admin/bestellingen");
}
