"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSale(formData: FormData) {
  const supabase = createAdminClient();
  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const { error } = await supabase.from("sales").insert({
    name,
    slug,
    description: (formData.get("description") as string).trim(),
    icon: ((formData.get("icon") as string) || "🛍️").trim(),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/verkopen?error=1");
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/verkopen");
}

export async function updateSale(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sales").update({
    name: (formData.get("name") as string).trim(),
    slug: (formData.get("slug") as string).trim(),
    description: (formData.get("description") as string).trim(),
    icon: ((formData.get("icon") as string) || "🛍️").trim(),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/verkopen?error=1");
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
  redirect("/admin/verkopen");
}

export async function deleteSale(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sales").delete().eq("id", id);
  revalidatePath("/admin/verkopen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/verkopen");
}

export async function toggleSaleActive(id: string, currentValue: boolean) {
  const supabase = createAdminClient();
  await supabase.from("sales").update({ is_active: !currentValue }).eq("id", id);
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
}
