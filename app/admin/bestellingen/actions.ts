"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

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
