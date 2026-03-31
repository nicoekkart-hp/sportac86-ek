import { TeamMember } from "@/lib/types";

const roles = ["Atleet", "Coach", "Begeleider", "Oudercomité"];
const disciplines = ["", "Freestyle", "Speed", "Team", "Dubbel"];

export function TeamForm({ member, action }: { member?: TeamMember; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input type="text" name="name" required defaultValue={member?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Rol *</label>
          <select name="role" required defaultValue={member?.role ?? "Atleet"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Discipline</label>
          <select name="discipline" defaultValue={member?.discipline ?? ""} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {disciplines.map((d) => <option key={d} value={d}>{d || "— geen —"}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input type="number" name="sort_order" min={0} defaultValue={member?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Foto URL</label>
        <input type="url" name="image_url" defaultValue={member?.image_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Bio</label>
        <textarea name="bio" rows={3} defaultValue={member?.bio ?? ""} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
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
