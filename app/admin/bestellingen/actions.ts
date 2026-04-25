"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { calcCart } from "@/lib/pricing";
import { sendPaymentConfirmation, sendPaymentReminder } from "@/lib/email";

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

async function sendReminderForOrderId(supabase: ReturnType<typeof createAdminClient>, id: string): Promise<"sent" | "skipped"> {
  const { data: order } = await supabase
    .from("orders")
    .select("name, email, items, sale_id, payment_status, payment_reference, last_reminder_at, reminder_count, sales(name)")
    .eq("id", id)
    .single<{
      name: string;
      email: string;
      items: Record<string, number> | null;
      sale_id: string | null;
      payment_status: "pending" | "paid" | "failed";
      payment_reference: string | null;
      last_reminder_at: string | null;
      reminder_count: number;
      sales: { name: string } | null;
    }>();

  if (!order || order.payment_status !== "pending" || !order.email || !order.payment_reference || !order.sale_id) {
    return "skipped";
  }
  if (order.last_reminder_at) {
    const since = Date.now() - new Date(order.last_reminder_at).getTime();
    if (since < REMINDER_COOLDOWN_MS) return "skipped";
  }

  const [{ data: products }, { data: groups }] = await Promise.all([
    supabase.from("products").select("*").eq("sale_id", order.sale_id),
    supabase.from("pack_groups").select("*").eq("sale_id", order.sale_id),
  ]);
  const { totalCents, lineItems } = calcCart(products ?? [], groups ?? [], order.items ?? {});
  if (totalCents <= 0) return "skipped";

  await sendPaymentReminder({
    to: order.email,
    name: order.name,
    reference: order.payment_reference,
    totalCents,
    kind: "order",
    contextLabel: order.sales?.name,
    lineItems: lineItems.map((l) => ({ name: l.name, quantity: l.quantity, unitCents: l.unitAmount })),
    reminderCount: order.reminder_count + 1,
  });

  await supabase
    .from("orders")
    .update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: order.reminder_count + 1,
    })
    .eq("id", id);

  return "sent";
}

export async function sendOrderReminder(id: string) {
  const supabase = createAdminClient();
  await sendReminderForOrderId(supabase, id);
  revalidatePath("/admin/bestellingen");
}

export async function sendOverdueOrderReminders() {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_status", "pending")
    .lt("created_at", sevenDaysAgo);

  for (const r of rows ?? []) {
    await sendReminderForOrderId(supabase, r.id);
  }
  revalidatePath("/admin/bestellingen");
}
