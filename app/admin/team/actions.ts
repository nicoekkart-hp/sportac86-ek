"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTeamMember(formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("team_members").insert({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    discipline: (formData.get("discipline") as string) || null,
    bio: (formData.get("bio") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });

  if (error) redirect("/admin/team?error=1");
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}

export async function updateTeamMember(id: string, formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("team_members").update({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    discipline: (formData.get("discipline") as string) || null,
    bio: (formData.get("bio") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);

  if (error) redirect("/admin/team?error=1");
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}

export async function deleteTeamMember(id: string) {
  const supabase = createAdminClient();
  await supabase.from("team_members").delete().eq("id", id);
  revalidatePath("/admin/team");
  revalidatePath("/team");
  redirect("/admin/team");
}
