"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PRODUCT_PHOTO_BUCKET = "product-photos";

async function resolveImageUrl(formData: FormData): Promise<string | null> {
  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const supabase = createAdminClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(PRODUCT_PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
  }
  const url = (formData.get("image_url") as string)?.trim();
  return url ? url : null;
}

function optionalString(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s ? s : null;
}

export async function createProduct(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url: await resolveImageUrl(formData),
    description: optionalString(formData.get("description")),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url: await resolveImageUrl(formData),
    description: optionalString(formData.get("description")),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function deleteProduct(id: string) {
  const supabase = createAdminClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function toggleProductActive(id: string, currentValue: boolean) {
  const supabase = createAdminClient();
  await supabase.from("products").update({ is_active: !currentValue }).eq("id", id);
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
}
