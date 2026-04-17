"use client";

import Image from "next/image";
import { useState } from "react";
import { PackGroup, Product, Sale } from "@/lib/types";

export function ProductForm({
  product,
  sales,
  packGroups,
  action,
}: {
  product?: Product;
  sales: Sale[];
  packGroups: PackGroup[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl" encType="multipart/form-data">
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
          <p className="text-xs text-gray-sub mt-1">Gebruikt als de pack groep leeg is.</p>
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
          placeholder="Barrel Selection Chenin Blanc 2025"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Pack groep (optioneel)</label>
        <select
          name="pack_group_id"
          defaultValue={product?.pack_group_id ?? ""}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
        >
          <option value="">— Geen pack groep —</option>
          {packGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {packGroups.length === 0 && (
          <p className="text-xs text-gray-sub mt-1">
            Nog geen pack groepen voor deze verkoop. Maak er eerst een aan onder Pack groepen.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Foto</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative w-20 h-24 rounded-sm overflow-hidden bg-[#ddd8d0] flex-shrink-0">
              <Image src={preview} alt="Preview" fill className="object-cover" sizes="80px" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              name="image_file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
              className="w-full text-sm text-gray-body file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-red-sportac file:text-white hover:file:bg-red-600 file:cursor-pointer"
            />
            <p className="text-xs text-gray-sub">Of gebruik een externe URL:</p>
            <input
              type="url"
              name="image_url"
              defaultValue={product?.image_url ?? ""}
              placeholder="https://..."
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              onChange={(e) => { if (e.target.value) setPreview(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving (Markdown)</label>
        <textarea
          name="description"
          rows={8}
          defaultValue={product?.description ?? ""}
          placeholder="- Zuid-Afrika — Western Cape&#10;- Druif: chenin blanc&#10;- Fris, mineraal, past bij vis en tapas"
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-sportac resize-y"
        />
        <p className="text-xs text-gray-sub mt-1">
          Zichtbaar als klanten op &ldquo;Meer info&rdquo; klikken op de verkooppagina. Ondersteunt Markdown.
        </p>
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
