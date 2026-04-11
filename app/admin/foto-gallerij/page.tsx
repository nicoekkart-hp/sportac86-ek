import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { GalleryPhoto } from "@/lib/types";
import { deleteGalleryPhoto } from "./actions";

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

      {photos.length === 0 && (
        <p className="text-gray-sub text-sm">Nog geen foto&apos;s in de gallerij.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden flex flex-col"
          >
            <div className="relative aspect-[4/3] bg-[#ddd8d0]">
              <Image
                src={photo.image_url}
                alt={photo.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {!photo.is_published && (
                <div className="absolute top-2 left-2 text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">
                  Verborgen
                </div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-sub truncate">
                  #{photo.sort_order} · {photo.alt || "geen alt-tekst"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                  href={`/admin/foto-gallerij/${photo.id}`}
                  className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-2.5 py-1 rounded-sm hover:border-gray-400 transition-colors"
                >
                  Bewerken
                </Link>
                <form action={deleteGalleryPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    className="text-xs text-red-sportac border border-red-sportac/30 px-2.5 py-1 rounded-sm hover:bg-red-sportac/10 transition-colors"
                  >
                    Verwijderen
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
