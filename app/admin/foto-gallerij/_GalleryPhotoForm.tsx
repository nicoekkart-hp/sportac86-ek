import { GalleryPhoto } from "@/lib/types";

export function GalleryPhotoForm({
  photo,
  action,
}: {
  photo?: GalleryPhoto;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div>
        <label className="block text-sm font-semibold mb-1">Foto uploaden</label>
        <input
          type="file"
          name="file"
          accept="image/*"
          className="w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-red-sportac file:px-4 file:py-2 file:text-white file:font-bold file:cursor-pointer hover:file:bg-red-600"
        />
        <p className="text-xs text-gray-sub mt-1">
          Max 5&nbsp;MB. Upload vervangt de bestaande afbeelding wanneer je een foto bewerkt.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">
          {photo ? "Huidige afbeelding URL" : "Of een externe URL"}
        </label>
        <input
          type="text"
          name="image_url"
          defaultValue={photo?.image_url}
          placeholder="https://... of /groepsfotos/..."
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
        <p className="text-xs text-gray-sub mt-1">
          {photo
            ? "Laat staan om de huidige foto te behouden, of vul een nieuwe URL in."
            : "Alleen nodig als je geen bestand uploadt."}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Alt-tekst</label>
        <input
          type="text"
          name="alt"
          defaultValue={photo?.alt}
          placeholder="Sportac 86 Deinze — groepsfoto"
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
        <p className="text-xs text-gray-sub mt-1">Beschrijving voor schermlezers en SEO.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input
            type="number"
            name="sort_order"
            min={0}
            defaultValue={photo?.sort_order ?? 0}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={photo?.is_published ?? true}
              className="accent-red-sportac"
            />
            Gepubliceerd (zichtbaar op de site)
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors"
        >
          Opslaan
        </button>
        <a
          href="/admin/foto-gallerij"
          className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors"
        >
          Annuleren
        </a>
      </div>
    </form>
  );
}
