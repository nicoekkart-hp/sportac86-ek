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
    if (error) {
      throw new Error(`image_upload_failed: ${error.message}`);
    }
    const { data } = supabase.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
  const url = (formData.get("image_url") as string)?.trim();
  return url ? url : null;
}

function optionalString(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s ? s : null;
}

export async function createProduct(formData: FormData) {
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const priceRaw = (formData.get("price_euros") as string)?.trim();
  const price_cents = priceRaw ? Math.round(parseFloat(priceRaw) * 100) : 0;

  if (!sale_id || !name || !Number.isFinite(price_cents) || price_cents <= 0) {
    redirect("/admin/producten?error=invalid");
  }

  let image_url: string | null;
  try {
    image_url = await resolveImageUrl(formData);
  } catch {
    redirect("/admin/producten?error=image_upload");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id,
    name,
    price_cents,
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url,
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
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const priceRaw = (formData.get("price_euros") as string)?.trim();
  const price_cents = priceRaw ? Math.round(parseFloat(priceRaw) * 100) : 0;

  if (!sale_id || !name || !Number.isFinite(price_cents) || price_cents <= 0) {
    redirect(`/admin/producten/${id}?error=invalid`);
  }

  let image_url: string | null;
  try {
    image_url = await resolveImageUrl(formData);
  } catch {
    redirect("/admin/producten?error=image_upload");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({
    sale_id,
    name,
    price_cents,
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url,
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
