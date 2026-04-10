"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const supabase = createAdminClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = formData.get("description") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = formData.get("location") as string;
  const price_euros = parseFloat(formData.get("price_euros") as string) || 0;
  const max_attendees = formData.get("max_attendees") ? parseInt(formData.get("max_attendees") as string, 10) : null;
  const image_url = (formData.get("image_url") as string) || null;
  const is_published = formData.get("is_published") === "on";
  const show_on_steunen = formData.get("show_on_steunen") === "on";
  const icon = ((formData.get("icon") as string) || "📅").trim();

  const { error } = await supabase.from("events").insert({
    title, slug, description, date, time, location,
    price_cents: Math.round(price_euros * 100),
    max_attendees,
    image_url,
    is_published,
    show_on_steunen,
    icon,
  });

  if (error) {
    console.error("Create event error:", error);
    redirect("/admin/evenementen?error=1");
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  redirect("/admin/evenementen");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createAdminClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = formData.get("description") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = formData.get("location") as string;
  const price_euros = parseFloat(formData.get("price_euros") as string) || 0;
  const max_attendees = formData.get("max_attendees") ? parseInt(formData.get("max_attendees") as string, 10) : null;
  const image_url = (formData.get("image_url") as string) || null;
  const is_published = formData.get("is_published") === "on";
  const show_on_steunen = formData.get("show_on_steunen") === "on";
  const icon = ((formData.get("icon") as string) || "📅").trim();

  const { error } = await supabase.from("events").update({
    title, slug, description, date, time, location,
    price_cents: Math.round(price_euros * 100),
    max_attendees,
    image_url,
    is_published,
    show_on_steunen,
    icon,
  }).eq("id", id);

  if (error) {
    console.error("Update event error:", error);
    redirect("/admin/evenementen?error=1");
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  revalidatePath(`/agenda/${slug}`);
  redirect("/admin/evenementen");
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  redirect("/admin/evenementen");
}

export async function togglePublish(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("events").update({ is_published: !current }).eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
}
