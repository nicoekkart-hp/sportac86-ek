"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function deleteRegistration(id: string) {
  const supabase = createAdminClient();
  await supabase.from("registrations").delete().eq("id", id).eq("payment_status", "pending");
  revalidatePath("/admin/inschrijvingen");
}
