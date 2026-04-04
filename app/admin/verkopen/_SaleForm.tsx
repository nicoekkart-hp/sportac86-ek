import { Sale } from "@/lib/types";

export function SaleForm({ sale, action }: { sale?: Sale; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={sale?.name}
            placeholder="Snoep"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Icoon (emoji)</label>
          <input
            type="text"
            name="icon"
            defaultValue={sale?.icon ?? "🛍️"}
            placeholder="🍬"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Slug *</label>
          <input
            type="text"
            name="slug"
            required
            defaultValue={sale?.slug}
            placeholder="snoep"
            pattern="[a-z0-9-]+"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
          <p className="text-xs text-gray-sub mt-1">Alleen kleine letters, cijfers en koppeltekens. Wordt gebruikt in de succes-URL.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={sale?.description}
          placeholder="Bestel een doos snoep via onze actie..."
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input
            type="number"
            name="sort_order"
            min={0}
            defaultValue={sale?.sort_order ?? 0}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={sale?.is_active ?? true} className="accent-red-sportac" />
            Actief (zichtbaar op site)
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/verkopen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
