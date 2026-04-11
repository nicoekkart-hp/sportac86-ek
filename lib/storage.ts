import { createAdminClient } from "@/lib/supabase-admin";

const GALLERY_BUCKET = "gallery";

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "foto";
  return `${base}${ext}`;
}

export async function uploadGalleryImage(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("Geen bestand geselecteerd.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Alleen afbeeldingen zijn toegestaan.");
  }

  const supabase = createAdminClient();
  const path = `${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload mislukt: ${error.message}`);
  }

  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
