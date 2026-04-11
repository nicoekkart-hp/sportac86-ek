"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGalleryPhoto(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gallery_photos").insert({
    image_url: (formData.get("image_url") as string).trim(),
    alt: ((formData.get("alt") as string) || "").trim(),
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
    is_published: formData.get("is_published") === "on",
  });
  if (error) redirect("/admin/foto-gallerij?error=1");
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
  redirect("/admin/foto-gallerij");
}

export async function updateGalleryPhoto(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gallery_photos").update({
    image_url: (formData.get("image_url") as string).trim(),
    alt: ((formData.get("alt") as string) || "").trim(),
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
    is_published: formData.get("is_published") === "on",
  }).eq("id", id);
  if (error) redirect("/admin/foto-gallerij?error=1");
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
  redirect("/admin/foto-gallerij");
}

export async function deleteGalleryPhoto(id: string) {
  const supabase = createAdminClient();
  await supabase.from("gallery_photos").delete().eq("id", id);
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
  redirect("/admin/foto-gallerij");
}
