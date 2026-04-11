import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { GalleryPhoto } from "@/lib/types";
import { GalleryPhotoForm } from "../_GalleryPhotoForm";
import { updateGalleryPhoto } from "../actions";

export default async function BewerkenGalleryPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("gallery_photos").select("*").eq("id", id).single();
  if (!data) notFound();
  const photo = data as GalleryPhoto;
  const action = updateGalleryPhoto.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">
          Foto bewerken
        </h1>
        <p className="text-gray-sub text-sm mt-1">{photo.alt || photo.image_url}</p>
      </div>
      <GalleryPhotoForm photo={photo} action={action} />
    </div>
  );
}
