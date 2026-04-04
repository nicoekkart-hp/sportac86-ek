"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function resolveImageUrl(formData: FormData): Promise<string | null> {
  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const supabase = createAdminClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("team-photos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from("team-photos").getPublicUrl(path);
      return data.publicUrl;
    }
  }
  return (formData.get("image_url") as string) || null;
}

export async function createTeamMember(formData: FormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("team_members").insert({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    discipline: formData.getAll("discipline").length > 0 ? formData.getAll("discipline") as string[] : null,
    bio: (() => {
      const age = (formData.get("bio_age") as string) || undefined;
      const why = (formData.get("bio_why") as string) || undefined;
      const favorite_discipline = (formData.get("bio_favorite_discipline") as string) || undefined;
      const years = (formData.get("bio_years") as string) || undefined;
      return (age || why || favorite_discipline || years) ? { age, why, favorite_discipline, years } : null;
    })(),
    image_url: await resolveImageUrl(formData),
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
    discipline: formData.getAll("discipline").length > 0 ? formData.getAll("discipline") as string[] : null,
    bio: (() => {
      const age = (formData.get("bio_age") as string) || undefined;
      const why = (formData.get("bio_why") as string) || undefined;
      const favorite_discipline = (formData.get("bio_favorite_discipline") as string) || undefined;
      const years = (formData.get("bio_years") as string) || undefined;
      return (age || why || favorite_discipline || years) ? { age, why, favorite_discipline, years } : null;
    })(),
    image_url: await resolveImageUrl(formData),
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
