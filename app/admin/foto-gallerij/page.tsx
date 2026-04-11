import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { GalleryPhoto } from "@/lib/types";
import { SortableGallery } from "./_SortableGallery";

export default async function FotoGallerijAdminPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("gallery_photos").select("*").order("sort_order");
  const photos: GalleryPhoto[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Foto-gallerij</h1>
          <p className="text-gray-sub text-sm mt-1">
            {photos.length} foto&apos;s — zichtbaar op de homepage
          </p>
        </div>
        <Link
          href="/admin/foto-gallerij/nieuw"
          className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors"
        >
          + Foto toevoegen
        </Link>
      </div>

      <SortableGallery initialPhotos={photos} />
    </div>
  );
}
