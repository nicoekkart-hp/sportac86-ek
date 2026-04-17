import { PackGroup, Sale } from "@/lib/types";

export function PackGroupForm({
  group,
  sales,
  action,
}: {
  group?: PackGroup;
  sales: Sale[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Verkoop *</label>
          <select
            name="sale_id"
            required
            defaultValue={group?.sale_id ?? ""}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
          >
            <option value="" disabled>Kies een verkoop...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={group?.name ?? ""}
            placeholder="Instapwijnen"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs per fles (€) *</label>
          <input
            type="number"
            name="unit_price_euros"
            required
            min={0.01}
            step={0.01}
            defaultValue={group ? (group.unit_price_cents / 100).toFixed(2) : ""}
            placeholder="10.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Pakketgrootte *</label>
          <input
            type="number"
            name="pack_size"
            required
            min={2}
            defaultValue={group?.pack_size ?? 6}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Pakketprijs (€) *</label>
          <input
            type="number"
            name="pack_price_euros"
            required
            min={0.01}
            step={0.01}
            defaultValue={group ? (group.pack_price_cents / 100).toFixed(2) : ""}
            placeholder="50.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Volgorde</label>
        <input
          type="number"
          name="sort_order"
          min={0}
          defaultValue={group?.sort_order ?? 0}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm w-32 focus:outline-none focus:border-red-sportac"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/pack-groepen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
