"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { sendSponsorRequestConfirmation } from "@/lib/email";

export async function deleteSponsorRequest(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sponsor_requests").delete().eq("id", id);
  revalidatePath("/admin/sponsor-aanvragen");
}

function parseStoredMessage(stored: string | null): {
  packageLabel: string | null;
  message: string | null;
} {
  if (!stored) return { packageLabel: null, message: null };

  const lines = stored.split("\n");
  const first = lines[0] ?? "";
  const prefix = "Gekozen pakket: ";

  if (first.startsWith(prefix)) {
    const packageLabel = first.slice(prefix.length).trim() || null;
    const rest = lines.slice(1).join("\n").trim();
    return { packageLabel, message: rest || null };
  }

  return { packageLabel: null, message: stored };
}

export async function resendSponsorConfirmation(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sponsor_requests")
    .select("email, message")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("[resendSponsorConfirmation] not found:", id, error);
    revalidatePath("/admin/sponsor-aanvragen");
    return;
  }

  const { packageLabel, message } = parseStoredMessage(data.message);
  await sendSponsorRequestConfirmation({
    to: data.email,
    packageLabel,
    message,
  });
  revalidatePath("/admin/sponsor-aanvragen");
}
