"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parsePackPricing(formData: FormData): {
  pack_size: number | null;
  pack_price_cents: number | null;
  error: string | null;
} {
  const rawSize = (formData.get("pack_size") as string | null)?.trim() ?? "";
  const rawPrice = (formData.get("pack_price_euros") as string | null)?.trim() ?? "";

  if (rawSize === "" && rawPrice === "") {
    return { pack_size: null, pack_price_cents: null, error: null };
  }
  if (rawSize === "" || rawPrice === "") {
    return {
      pack_size: null,
      pack_price_cents: null,
      error: "pack_incomplete",
    };
  }

  const size = parseInt(rawSize, 10);
  const priceCents = Math.round(parseFloat(rawPrice) * 100);

  if (!Number.isFinite(size) || size < 2 || !Number.isFinite(priceCents) || priceCents <= 0) {
    return {
      pack_size: null,
      pack_price_cents: null,
      error: "pack_invalid",
    };
  }

  return { pack_size: size, pack_price_cents: priceCents, error: null };
}

export async function createProduct(formData: FormData) {
  const pack = parsePackPricing(formData);
  if (pack.error) redirect(`/admin/producten?error=${pack.error}`);

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_size: pack.pack_size,
    pack_price_cents: pack.pack_price_cents,
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function updateProduct(id: string, formData: FormData) {
  const pack = parsePackPricing(formData);
  if (pack.error) redirect(`/admin/producten?error=${pack.error}`);

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_size: pack.pack_size,
    pack_price_cents: pack.pack_price_cents,
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
