"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function deleteDonation(id: string) {
  const supabase = createAdminClient();
  await supabase.from("donations").delete().eq("id", id).eq("payment_status", "pending");
  revalidatePath("/admin/donaties");
}
