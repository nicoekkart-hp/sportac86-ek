"use client";

import Image from "next/image";
import { useState } from "react";
import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { SlotsEditor } from "./_SlotsEditor";
import { TicketsEditor } from "./_TicketsEditor";

export function EventForm({
  event,
  slots,
  tickets,
  action,
}: {
  event?: EventRecord;
  slots: EventSlot[];
  tickets: EventTicket[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(event?.image_url ?? null);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-2xl" encType="multipart/form-data">
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

      <div>
        <label className="block text-sm font-semibold mb-1">Locatie</label>
        <input type="text" name="location" defaultValue={event?.location} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        <p className="text-xs text-gray-sub mt-1">Standaardlocatie. Per datum kan je optioneel een andere locatie zetten.</p>
      </div>

      <SlotsEditor initial={slots} />

      <TicketsEditor initial={tickets} />

      <div>
        <label className="block text-sm font-semibold mb-2">Foto</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative w-32 h-20 rounded-sm overflow-hidden bg-[#ddd8d0] flex-shrink-0">
              <Image src={preview} alt="Preview" fill className="object-cover" sizes="128px" />
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
              defaultValue={event?.image_url ?? ""}
              placeholder="https://..."
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              onChange={(e) => { if (e.target.value) setPreview(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_published" id="is_published" defaultChecked={event?.is_published} className="w-4 h-4 accent-red-500" />
        <label htmlFor="is_published" className="text-sm font-semibold">Gepubliceerd (zichtbaar op de site)</label>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="coming_soon" id="coming_soon" defaultChecked={event?.coming_soon ?? false} className="w-4 h-4 accent-red-500" />
        <label htmlFor="coming_soon" className="text-sm font-semibold">Binnenkort beschikbaar (inschrijven uitgeschakeld)</label>
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
