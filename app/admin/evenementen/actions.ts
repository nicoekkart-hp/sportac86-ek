"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const EVENT_PHOTO_BUCKET = "event-photos";

async function resolveImageUrl(formData: FormData): Promise<string | null> {
  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const supabase = createAdminClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(EVENT_PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      throw new Error(`image_upload_failed: ${error.message}`);
    }
    const { data } = supabase.storage.from(EVENT_PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
  const url = (formData.get("image_url") as string)?.trim();
  return url ? url : null;
}

type ParsedSlot = {
  id: string | null;
  date: string;
  time: string | null;
  location: string | null;
  max_attendees: number | null;
  sort_order: number;
};

type ParsedTicket = {
  id: string | null;
  name: string;
  price_cents: number;
  sort_order: number;
};

function parseSlots(formData: FormData): ParsedSlot[] {
  const count = parseInt((formData.get("slots_count") as string) ?? "0", 10) || 0;
  const out: ParsedSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = ((formData.get(`slots[${i}].date`) as string) ?? "").trim();
    if (!date) continue;
    const time = ((formData.get(`slots[${i}].time`) as string) ?? "").trim() || null;
    const location = ((formData.get(`slots[${i}].location`) as string) ?? "").trim() || null;
    const maxRaw = ((formData.get(`slots[${i}].max_attendees`) as string) ?? "").trim();
    const max_attendees = maxRaw ? parseInt(maxRaw, 10) : null;
    const idRaw = ((formData.get(`slots[${i}].id`) as string) ?? "").trim();
    out.push({
      id: idRaw || null,
      date,
      time,
      location,
      max_attendees,
      sort_order: i,
    });
  }
  return out;
}

function parseTickets(formData: FormData): ParsedTicket[] {
  const count = parseInt((formData.get("tickets_count") as string) ?? "0", 10) || 0;
  const out: ParsedTicket[] = [];
  for (let i = 0; i < count; i += 1) {
    const name = ((formData.get(`tickets[${i}].name`) as string) ?? "").trim();
    if (!name) continue;
    const price_euros = parseFloat((formData.get(`tickets[${i}].price_euros`) as string) ?? "0") || 0;
    const idRaw = ((formData.get(`tickets[${i}].id`) as string) ?? "").trim();
    out.push({
      id: idRaw || null,
      name,
      price_cents: Math.round(price_euros * 100),
      sort_order: i,
    });
  }
  return out;
}

function readEventFields(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = (formData.get("description") as string).trim();
  const location = ((formData.get("location") as string) || "").trim();
  const is_published = formData.get("is_published") === "on";
  const show_on_steunen = formData.get("show_on_steunen") === "on";
  const coming_soon = formData.get("coming_soon") === "on";
  const icon = ((formData.get("icon") as string) || "📅").trim();
  return { title, slug, description, location, is_published, show_on_steunen, coming_soon, icon };
}

async function upsertChildren(eventId: string, slots: ParsedSlot[], tickets: ParsedTicket[]) {
  const supabase = createAdminClient();

  const { data: existingSlots } = await supabase.from("event_slots").select("id").eq("event_id", eventId);
  const { data: existingTickets } = await supabase.from("event_tickets").select("id").eq("event_id", eventId);

  const submittedSlotIds = new Set(slots.map((s) => s.id).filter(Boolean) as string[]);
  const submittedTicketIds = new Set(tickets.map((t) => t.id).filter(Boolean) as string[]);

  const slotsToDelete = (existingSlots ?? []).map((s) => s.id).filter((id) => !submittedSlotIds.has(id));
  const ticketsToDelete = (existingTickets ?? []).map((t) => t.id).filter((id) => !submittedTicketIds.has(id));

  if (slotsToDelete.length > 0) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .in("slot_id", slotsToDelete);
    if ((count ?? 0) > 0) {
      return { error: "slot_in_use" as const };
    }
    const { error } = await supabase.from("event_slots").delete().in("id", slotsToDelete);
    if (error) return { error: "delete_slots" as const, message: error.message };
  }

  if (ticketsToDelete.length > 0) {
    const { error } = await supabase.from("event_tickets").delete().in("id", ticketsToDelete);
    if (error) return { error: "delete_tickets" as const, message: error.message };
  }

  for (const s of slots.filter((s) => s.id)) {
    const { error } = await supabase
      .from("event_slots")
      .update({ date: s.date, time: s.time, location: s.location, max_attendees: s.max_attendees, sort_order: s.sort_order })
      .eq("id", s.id!);
    if (error) return { error: "update_slot" as const, message: error.message };
  }
  for (const t of tickets.filter((t) => t.id)) {
    const { error } = await supabase
      .from("event_tickets")
      .update({ name: t.name, price_cents: t.price_cents, sort_order: t.sort_order })
      .eq("id", t.id!);
    if (error) return { error: "update_ticket" as const, message: error.message };
  }

  const newSlots = slots.filter((s) => !s.id).map((s) => ({
    event_id: eventId,
    date: s.date,
    time: s.time,
    location: s.location,
    max_attendees: s.max_attendees,
    sort_order: s.sort_order,
  }));
  if (newSlots.length > 0) {
    const { error } = await supabase.from("event_slots").insert(newSlots);
    if (error) return { error: "insert_slots" as const, message: error.message };
  }
  const newTickets = tickets.filter((t) => !t.id).map((t) => ({
    event_id: eventId,
    name: t.name,
    price_cents: t.price_cents,
    sort_order: t.sort_order,
  }));
  if (newTickets.length > 0) {
    const { error } = await supabase.from("event_tickets").insert(newTickets);
    if (error) return { error: "insert_tickets" as const, message: error.message };
  }

  return { error: null };
}

export async function createEvent(formData: FormData) {
  const supabase = createAdminClient();
  const fields = readEventFields(formData);
  const slots = parseSlots(formData);
  const tickets = parseTickets(formData);

  if (!fields.title || !fields.slug || !fields.description) {
    redirect("/admin/evenementen?error=invalid");
  }
  if (slots.length === 0) {
    redirect("/admin/evenementen?error=no_slots");
  }

  let image_url: string | null;
  try {
    image_url = await resolveImageUrl(formData);
  } catch {
    redirect("/admin/evenementen?error=image_upload");
  }

  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...fields, image_url })
    .select("id, slug")
    .single();

  if (error || !created) {
    console.error("Create event error:", error);
    redirect("/admin/evenementen?error=db");
  }

  const result = await upsertChildren(created.id, slots, tickets);
  if (result.error) {
    console.error("Upsert children error:", result);
    redirect(`/admin/evenementen?error=${result.error}`);
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${created.slug}`);
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const fields = readEventFields(formData);
  const slots = parseSlots(formData);
  const tickets = parseTickets(formData);

  if (!fields.title || !fields.slug || !fields.description) {
    redirect(`/admin/evenementen/${id}?error=invalid`);
  }
  if (slots.length === 0) {
    redirect(`/admin/evenementen/${id}?error=no_slots`);
  }

  let image_url: string | null;
  try {
    image_url = await resolveImageUrl(formData);
  } catch {
    redirect(`/admin/evenementen/${id}?error=image_upload`);
  }

  const { error } = await supabase.from("events").update({ ...fields, image_url }).eq("id", id);
  if (error) {
    console.error("Update event error:", error);
    redirect(`/admin/evenementen/${id}?error=db`);
  }

  const result = await upsertChildren(id, slots, tickets);
  if (result.error) {
    console.error("Upsert children error:", result);
    redirect(`/admin/evenementen/${id}?error=${result.error}`);
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${fields.slug}`);
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function togglePublish(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("events").update({ is_published: !current }).eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  revalidatePath("/");
}
