"use client";

import Image from "next/image";
import { useState } from "react";
import { TeamMember } from "@/lib/types";

const roles = ["Skipper", "Coach", "Begeleider", "Oudercomité"];
const disciplines = ["Freestyle", "Speed"];

export function TeamForm({ member, action }: { member?: TeamMember; action: (formData: FormData) => Promise<void> }) {
  const [preview, setPreview] = useState<string | null>(member?.image_url ?? null);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl" encType="multipart/form-data">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input type="text" name="name" required defaultValue={member?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Rol *</label>
          <select name="role" required defaultValue={member?.role ?? "Skipper"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Discipline</label>
          <div className="flex gap-4">
            {disciplines.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="discipline"
                  value={d}
                  defaultChecked={member?.discipline?.includes(d) ?? false}
                  className="accent-red-sportac"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input type="number" name="sort_order" min={0} defaultValue={member?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Foto</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative w-20 h-24 rounded-sm overflow-hidden bg-[#ddd8d0] flex-shrink-0">
              <Image src={preview} alt="Preview" fill className="object-cover object-top" sizes="80px" />
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
              defaultValue={member?.image_url ?? ""}
              placeholder="https://..."
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              onChange={(e) => { if (e.target.value) setPreview(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="block text-sm font-semibold">Over de skipper</label>
        <div>
          <label className="block text-xs text-gray-sub mb-1">Leeftijd</label>
          <input type="text" name="bio_age" defaultValue={member?.bio?.age ?? ""} placeholder="bv. 14" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-xs text-gray-sub mb-1">Waarom hou je van ropeskipping?</label>
          <textarea name="bio_why" rows={2} defaultValue={member?.bio?.why ?? ""} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
        </div>
        <div>
          <label className="block text-xs text-gray-sub mb-1">Favoriete discipline</label>
          <input type="text" name="bio_favorite_discipline" defaultValue={member?.bio?.favorite_discipline ?? ""} placeholder="bv. Speed" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-xs text-gray-sub mb-1">Hoe lang doe je al aan ropeskipping?</label>
          <input type="text" name="bio_years" defaultValue={member?.bio?.years ?? ""} placeholder="bv. 3 jaar" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/team" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
