"use client";

import Image from "next/image";
import { useState } from "react";
import { Sponsor } from "@/lib/types";

const levels = [
  { value: "gold", label: "Goud" },
  { value: "silver", label: "Zilver" },
  { value: "bronze", label: "Brons" },
  { value: "partner", label: "Partner" },
];

export function SponsorForm({ sponsor, action }: { sponsor?: Sponsor; action: (formData: FormData) => Promise<void> }) {
  const [preview, setPreview] = useState<string | null>(sponsor?.logo_url ?? null);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl" encType="multipart/form-data">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input type="text" name="name" required defaultValue={sponsor?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Niveau *</label>
          <select name="level" required defaultValue={sponsor?.level ?? "partner"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Website URL</label>
        <input type="url" name="website_url" defaultValue={sponsor?.website_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Logo</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative w-24 h-24 rounded-sm overflow-hidden bg-[#ddd8d0] flex-shrink-0 flex items-center justify-center">
              <Image src={preview} alt="Preview" fill className="object-contain p-2" sizes="96px" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              name="logo_file"
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
              name="logo_url"
              defaultValue={sponsor?.logo_url ?? ""}
              placeholder="https://..."
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              onChange={(e) => { if (e.target.value) setPreview(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Volgorde</label>
        <input type="number" name="sort_order" min={0} defaultValue={sponsor?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/sponsors" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
