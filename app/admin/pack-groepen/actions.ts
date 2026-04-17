"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseEuros(raw: FormDataEntryValue | null): number {
  const str = typeof raw === "string" ? raw.trim() : "";
  const n = parseFloat(str);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function parsePackSize(raw: FormDataEntryValue | null): number {
  const str = typeof raw === "string" ? raw.trim() : "";
  const n = parseInt(str, 10);
  if (!Number.isFinite(n) || n < 2) return 0;
  return n;
}

export async function createPackGroup(formData: FormData) {
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const unit_price_cents = parseEuros(formData.get("unit_price_euros"));
  const pack_size = parsePackSize(formData.get("pack_size"));
  const pack_price_cents = parseEuros(formData.get("pack_price_euros"));
  const sort_order = parseInt(formData.get("sort_order") as string, 10) || 0;

  if (!sale_id || !name || !unit_price_cents || !pack_size || !pack_price_cents) {
    redirect("/admin/pack-groepen?error=invalid");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("pack_groups").insert({
    sale_id,
    name,
    unit_price_cents,
    pack_size,
    pack_price_cents,
    sort_order,
  });
  if (error) redirect("/admin/pack-groepen?error=1");
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}

export async function updatePackGroup(id: string, formData: FormData) {
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const unit_price_cents = parseEuros(formData.get("unit_price_euros"));
  const pack_size = parsePackSize(formData.get("pack_size"));
  const pack_price_cents = parseEuros(formData.get("pack_price_euros"));
  const sort_order = parseInt(formData.get("sort_order") as string, 10) || 0;

  if (!sale_id || !name || !unit_price_cents || !pack_size || !pack_price_cents) {
    redirect(`/admin/pack-groepen/${id}?error=invalid`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("pack_groups").update({
    sale_id,
    name,
    unit_price_cents,
    pack_size,
    pack_price_cents,
    sort_order,
  }).eq("id", id);
  if (error) redirect("/admin/pack-groepen?error=1");
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}

export async function deletePackGroup(id: string) {
  const supabase = createAdminClient();
  await supabase.from("pack_groups").delete().eq("id", id);
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}
