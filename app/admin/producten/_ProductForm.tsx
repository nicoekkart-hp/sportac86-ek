import { Product, Sale } from "@/lib/types";

export function ProductForm({
  product,
  sales,
  action,
}: {
  product?: Product;
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
            defaultValue={product?.sale_id ?? ""}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
          >
            <option value="" disabled>Kies een verkoop...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs (€) *</label>
          <input
            type="number"
            name="price_euros"
            required
            min={0}
            step={0.01}
            defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
            placeholder="18.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Naam *</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={product?.name}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          placeholder="Mars (doos 24 stuks)"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input
            type="number"
            name="sort_order"
            min={0}
            defaultValue={product?.sort_order ?? 0}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="accent-red-sportac" />
            Actief (zichtbaar op site)
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/producten" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
