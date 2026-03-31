"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function toggleOrderStatus(id: string, current: "new" | "handled") {
  const supabase = createAdminClient();
  await supabase.from("orders").update({ status: current === "new" ? "handled" : "new" }).eq("id", id);
  revalidatePath("/admin/bestellingen");
}
