"use client";

import { useState } from "react";
import { EventTicket } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  price_euros: string;
};

let nextLocal = 0;
function localId() {
  nextLocal += 1;
  return `new-t-${nextLocal}`;
}

function toRow(t: EventTicket): Row {
  return {
    id: t.id,
    name: t.name,
    price_euros: (t.price_cents / 100).toFixed(2),
  };
}

export function TicketsEditor({ initial }: { initial: EventTicket[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0 ? initial.map(toRow) : [],
  );

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const add = () =>
    setRows((prev) => [...prev, { id: localId(), name: "", price_euros: "" }]);

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold">Tickets</label>
      <p className="text-xs text-gray-sub">
        Laat leeg voor een gratis evenement. Voorbeelden: Volwassene €20, Kind €15.
      </p>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-start">
          <input type="hidden" name={`tickets[${i}].id`} value={r.id.startsWith("new-t-") ? "" : r.id} />
          <input
            type="text"
            required
            name={`tickets[${i}].name`}
            placeholder="Volwassene"
            value={r.name}
            onChange={(e) => update(r.id, { name: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="number"
            required
            min={0}
            step={0.01}
            name={`tickets[${i}].price_euros`}
            placeholder="€"
            value={r.price_euros}
            onChange={(e) => update(r.id, { price_euros: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <button
            type="button"
            onClick={() => remove(r.id)}
            className="text-red-sportac text-xs font-bold border border-red-sportac/30 px-2 py-1.5 rounded-sm hover:bg-red-sportac/10"
            aria-label="Verwijder ticket"
          >
            ✕
          </button>
        </div>
      ))}
      <input type="hidden" name="tickets_count" value={rows.length} />
      <button
        type="button"
        onClick={add}
        className="self-start text-xs font-semibold text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10"
      >
        + Ticket toevoegen
      </button>
    </div>
  );
}
