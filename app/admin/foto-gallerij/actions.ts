"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { uploadGalleryImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function resolveImageUrl(formData: FormData, fallback?: string): Promise<string | null> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    return await uploadGalleryImage(file);
  }
  const urlField = ((formData.get("image_url") as string) || "").trim();
  if (urlField) return urlField;
  return fallback ?? null;
}

export async function createGalleryPhoto(formData: FormData) {
  const supabase = createAdminClient();

  const image_url = await resolveImageUrl(formData);
  if (!image_url) redirect("/admin/foto-gallerij/nieuw?error=missing-image");

  const { error } = await supabase.from("gallery_photos").insert({
    image_url,
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

  const { data: existing } = await supabase
    .from("gallery_photos")
    .select("image_url")
    .eq("id", id)
    .single();

  const image_url = await resolveImageUrl(formData, existing?.image_url);
  if (!image_url) redirect(`/admin/foto-gallerij/${id}?error=missing-image`);

  const { error } = await supabase.from("gallery_photos").update({
    image_url,
    alt: ((formData.get("alt") as string) || "").trim(),
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
    is_published: formData.get("is_published") === "on",
  }).eq("id", id);
  if (error) redirect("/admin/foto-gallerij?error=1");
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
  redirect("/admin/foto-gallerij");
}

export async function reorderGalleryPhotos(orderedIds: string[]): Promise<void> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  const supabase = createAdminClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("gallery_photos").update({ sort_order: index }).eq("id", id)
    )
  );
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
}

export async function deleteGalleryPhoto(id: string) {
  const supabase = createAdminClient();
  await supabase.from("gallery_photos").delete().eq("id", id);
  revalidatePath("/admin/foto-gallerij");
  revalidatePath("/");
  redirect("/admin/foto-gallerij");
}
