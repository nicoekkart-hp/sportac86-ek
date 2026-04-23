"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function deleteSponsorRequest(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sponsor_requests").delete().eq("id", id);
  revalidatePath("/admin/sponsor-aanvragen");
}
