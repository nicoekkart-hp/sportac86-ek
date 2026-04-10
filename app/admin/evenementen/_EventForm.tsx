import { EventRecord } from "@/lib/types";

export function EventForm({ event, action }: { event?: EventRecord; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Titel *</label>
          <input type="text" name="title" required defaultValue={event?.title} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Slug *</label>
          <input type="text" name="slug" required defaultValue={event?.slug} placeholder="spaghettiavond-2025" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac font-mono" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving *</label>
        <textarea name="description" required rows={4} defaultValue={event?.description} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Datum *</label>
          <input type="date" name="date" required defaultValue={event?.date} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Uur *</label>
          <input type="time" name="time" required defaultValue={event?.time} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs (€)</label>
          <input type="number" name="price_euros" min={0} step={0.01} defaultValue={event ? event.price_cents / 100 : 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Locatie *</label>
          <input type="text" name="location" required defaultValue={event?.location} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Max. deelnemers</label>
          <input type="number" name="max_attendees" min={1} defaultValue={event?.max_attendees ?? ""} placeholder="Leeglaten = onbeperkt" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Afbeelding URL</label>
        <input type="url" name="image_url" defaultValue={event?.image_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_published" id="is_published" defaultChecked={event?.is_published} className="w-4 h-4 accent-red-500" />
        <label htmlFor="is_published" className="text-sm font-semibold">Gepubliceerd (zichtbaar op de site)</label>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="show_on_steunen" id="show_on_steunen" defaultChecked={event?.show_on_steunen} className="w-4 h-4 accent-red-500" />
        <label htmlFor="show_on_steunen" className="text-sm font-semibold">Tonen als tegel op steunen-pagina</label>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Icoon (emoji)</label>
        <input
          type="text"
          name="icon"
          defaultValue={event?.icon ?? "📅"}
          placeholder="🍝"
          className="w-32 border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
        <p className="text-xs text-gray-sub mt-1">Gebruikt voor de tegel op de steunen-pagina.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/evenementen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
