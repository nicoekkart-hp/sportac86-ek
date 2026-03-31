"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSponsor(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sponsors").insert({
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    website_url: (formData.get("website_url") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/sponsors?error=1");
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}

export async function updateSponsor(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sponsors").update({
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    website_url: (formData.get("website_url") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/sponsors?error=1");
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}

export async function deleteSponsor(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sponsors").delete().eq("id", id);
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  redirect("/admin/sponsors");
}
