"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { sendPaymentConfirmation } from "@/lib/email";

export async function deleteRegistration(id: string) {
  const supabase = createAdminClient();
  await supabase.from("registrations").delete().eq("id", id).eq("payment_status", "pending");
  revalidatePath("/admin/inschrijvingen");
}

export async function togglePaymentStatus(id: string, current: "pending" | "paid" | "failed") {
  if (current === "failed") return;
  const supabase = createAdminClient();
  const next = current === "paid" ? "pending" : "paid";
  await supabase.from("registrations").update({ payment_status: next }).eq("id", id);

  if (next === "paid") {
    const { data: reg } = await supabase
      .from("registrations")
      .select("name, email, tickets, event_id, payment_reference, events(title)")
      .eq("id", id)
      .single<{
        name: string;
        email: string;
        tickets: Record<string, number> | null;
        event_id: string;
        payment_reference: string | null;
        events: { title: string } | null;
      }>();

    if (reg && reg.email && reg.payment_reference) {
      const { data: ticketRows } = await supabase
        .from("event_tickets")
        .select("id, name, price_cents")
        .eq("event_id", reg.event_id);
      const ticketById = new Map((ticketRows ?? []).map((t) => [t.id, t]));
      let totalCents = 0;
      const summaryParts: string[] = [];
      for (const [tid, qty] of Object.entries(reg.tickets ?? {})) {
        const t = ticketById.get(tid);
        if (!t || qty <= 0) continue;
        totalCents += t.price_cents * qty;
        summaryParts.push(`${qty}× ${t.name}`);
      }
      await sendPaymentConfirmation({
        to: reg.email,
        name: reg.name,
        reference: reg.payment_reference,
        totalCents,
        kind: "registration",
        contextLabel: reg.events?.title,
        itemSummary: summaryParts.length > 0 ? summaryParts.join(", ") : undefined,
      });
    }
  }

  revalidatePath("/admin/inschrijvingen");
}
