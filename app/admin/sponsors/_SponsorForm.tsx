import { Sponsor } from "@/lib/types";

const levels = [
  { value: "gold", label: "Goud" },
  { value: "silver", label: "Zilver" },
  { value: "bronze", label: "Brons" },
  { value: "partner", label: "Partner" },
];

export function SponsorForm({ sponsor, action }: { sponsor?: Sponsor; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
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
        <label className="block text-sm font-semibold mb-1">Logo URL</label>
        <input type="url" name="logo_url" defaultValue={sponsor?.logo_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
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
