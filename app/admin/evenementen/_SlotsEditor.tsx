"use client";

import { useState } from "react";
import { EventSlot } from "@/lib/types";

type Row = {
  id: string;            // either real DB id or local "new-N"
  date: string;
  time: string;
  location: string;
  max_attendees: string;
};

let nextLocal = 0;
function localId() {
  nextLocal += 1;
  return `new-${nextLocal}`;
}

function toRow(s: EventSlot): Row {
  return {
    id: s.id,
    date: s.date,
    time: s.time?.slice(0, 5) ?? "",
    location: s.location ?? "",
    max_attendees: s.max_attendees?.toString() ?? "",
  };
}

export function SlotsEditor({ initial }: { initial: EventSlot[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map(toRow)
      : [{ id: localId(), date: "", time: "", location: "", max_attendees: "" }],
  );

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const add = () =>
    setRows((prev) => [...prev, { id: localId(), date: "", time: "", location: "", max_attendees: "" }]);

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold">Datums *</label>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[140px_110px_1fr_120px_auto] gap-2 items-start">
          <input type="hidden" name={`slots[${i}].id`} value={r.id.startsWith("new-") ? "" : r.id} />
          <input
            type="date"
            required
            name={`slots[${i}].date`}
            value={r.date}
            onChange={(e) => update(r.id, { date: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="time"
            name={`slots[${i}].time`}
            value={r.time}
            onChange={(e) => update(r.id, { time: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="text"
            name={`slots[${i}].location`}
            placeholder="Locatie (optioneel — anders die van het event)"
            value={r.location}
            onChange={(e) => update(r.id, { location: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="number"
            min={1}
            name={`slots[${i}].max_attendees`}
            placeholder="Max"
            value={r.max_attendees}
            onChange={(e) => update(r.id, { max_attendees: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <button
            type="button"
            onClick={() => remove(r.id)}
            disabled={rows.length === 1}
            className="text-red-sportac text-xs font-bold border border-red-sportac/30 px-2 py-1.5 rounded-sm hover:bg-red-sportac/10 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Verwijder datum"
          >
            ✕
          </button>
        </div>
      ))}
      <input type="hidden" name="slots_count" value={rows.length} />
      <button
        type="button"
        onClick={add}
        className="self-start text-xs font-semibold text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10"
      >
        + Datum toevoegen
      </button>
    </div>
  );
}
