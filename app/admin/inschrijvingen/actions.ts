"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { sendPaymentConfirmation, sendPaymentReminder } from "@/lib/email";

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

async function sendReminderForRegistrationId(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<"sent" | "skipped"> {
  const { data: reg } = await supabase
    .from("registrations")
    .select("name, email, tickets, event_id, payment_status, payment_reference, last_reminder_at, reminder_count, events(title)")
    .eq("id", id)
    .single<{
      name: string;
      email: string;
      tickets: Record<string, number> | null;
      event_id: string;
      payment_status: "pending" | "paid" | "failed";
      payment_reference: string | null;
      last_reminder_at: string | null;
      reminder_count: number;
      events: { title: string } | null;
    }>();

  if (!reg || reg.payment_status !== "pending" || !reg.email || !reg.payment_reference) {
    return "skipped";
  }
  if (reg.last_reminder_at) {
    const since = Date.now() - new Date(reg.last_reminder_at).getTime();
    if (since < REMINDER_COOLDOWN_MS) return "skipped";
  }

  const { data: ticketRows } = await supabase
    .from("event_tickets")
    .select("id, name, price_cents")
    .eq("event_id", reg.event_id);
  const ticketById = new Map((ticketRows ?? []).map((t) => [t.id, t]));

  let totalCents = 0;
  const lineItems: { name: string; quantity: number; unitCents: number }[] = [];
  for (const [tid, qty] of Object.entries(reg.tickets ?? {})) {
    const t = ticketById.get(tid);
    if (!t || qty <= 0) continue;
    totalCents += t.price_cents * qty;
    lineItems.push({ name: t.name, quantity: qty, unitCents: t.price_cents });
  }
  if (totalCents <= 0) return "skipped";

  await sendPaymentReminder({
    to: reg.email,
    name: reg.name,
    reference: reg.payment_reference,
    totalCents,
    kind: "registration",
    contextLabel: reg.events?.title,
    lineItems,
    reminderCount: reg.reminder_count + 1,
  });

  await supabase
    .from("registrations")
    .update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: reg.reminder_count + 1,
    })
    .eq("id", id);

  return "sent";
}

export async function sendRegistrationReminder(id: string) {
  const supabase = createAdminClient();
  await sendReminderForRegistrationId(supabase, id);
  revalidatePath("/admin/inschrijvingen");
}

export async function sendOverdueRegistrationReminders() {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("registrations")
    .select("id")
    .eq("payment_status", "pending")
    .lt("created_at", sevenDaysAgo);

  for (const r of rows ?? []) {
    await sendReminderForRegistrationId(supabase, r.id);
  }
  revalidatePath("/admin/inschrijvingen");
}
