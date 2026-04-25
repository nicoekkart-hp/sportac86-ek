"use client";

import { useMemo, useState } from "react";
import { EventSlot, EventTicket } from "@/lib/types";
import { formatPrice } from "@/lib/format";

type SlotWithTaken = EventSlot & { taken: number };

const FMT_DATE = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function RegistrationForm({
  eventId,
  eventSlug,
  slots,
  tickets,
  defaultLocation,
}: {
  eventId: string;
  eventSlug: string;
  slots: SlotWithTaken[];
  tickets: EventTicket[];
  defaultLocation: string;
}) {
  const isFree = tickets.length === 0;

  const availableSlots = slots.filter(
    (s) => s.max_attendees === null || s.taken < s.max_attendees,
  );

  const [slotId, setSlotId] = useState<string>(availableSlots[0]?.id ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const totalCents = useMemo(() => {
    if (isFree) return 0;
    return tickets.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price_cents, 0);
  }, [qty, tickets, isFree]);

  const totalPersons = useMemo(() => {
    if (isFree) return 1;
    return Object.values(qty).reduce((s, n) => s + n, 0);
  }, [qty, isFree]);

  const allFull = availableSlots.length === 0;
  const canSubmit = !allFull && slotId !== "" && (isFree || totalPersons > 0);

  if (allFull) {
    return (
      <p className="text-sm text-red-sportac font-semibold py-4">
        Volzet — geen plaatsen meer beschikbaar.
      </p>
    );
  }

  const setTicketQty = (id: string, value: number) => {
    setQty((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  const action = isFree ? "/api/registrations" : "/api/checkout/inschrijving";

  return (
    <form
      action={action}
      method="POST"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_slug" value={eventSlug} />

      <div>
        <label className="block text-sm font-semibold mb-2">Datum *</label>
        <div className="flex flex-col gap-2">
          {slots.map((s) => {
            const full = s.max_attendees !== null && s.taken >= s.max_attendees;
            const left = s.max_attendees !== null ? Math.max(0, s.max_attendees - s.taken) : null;
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 border rounded-sm px-3 py-2 text-sm cursor-pointer ${full ? "border-[#e8e4df] bg-gray-50 cursor-not-allowed opacity-60" : "border-[#e8e4df] hover:border-red-sportac"} ${slotId === s.id ? "border-red-sportac" : ""}`}
              >
                <input
                  type="radio"
                  name="slot_id"
                  value={s.id}
                  checked={slotId === s.id}
                  disabled={full}
                  onChange={() => setSlotId(s.id)}
                  className="accent-red-500"
                />
                <span className="flex-1">
                  <strong className="text-gray-dark">{FMT_DATE.format(parseLocalDate(s.date))}</strong>
                  {s.time && <span className="text-gray-sub"> · {s.time.slice(0, 5)}</span>}
                  {(s.location ?? defaultLocation) && (
                    <span className="text-gray-sub"> · {s.location ?? defaultLocation}</span>
                  )}
                </span>
                {full && (
                  <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-2 py-0.5 rounded-sm">Volzet</span>
                )}
                {!full && left !== null && (
                  <span className="text-xs text-gray-sub">{left} vrij</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {!isFree && (
        <div>
          <label className="block text-sm font-semibold mb-2">Tickets *</label>
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex-1 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-gray-sub"> — {formatPrice(t.price_cents)}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={20}
                  name={`tickets.${t.id}`}
                  value={qty[t.id] || ""}
                  onChange={(e) => setTicketQty(t.id, Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Naam *</label>
        <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Voor- en achternaam" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
        <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Opmerkingen</label>
        <textarea name="remarks" rows={3} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none" placeholder="Dieetwensen, vragen, ..." />
      </div>

      {/* Free events still need num_persons for the existing /api/registrations route */}
      {isFree && <input type="hidden" name="num_persons" value={1} />}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Bezig met versturen…"
          : isFree
            ? "Inschrijven"
            : totalCents === 0
              ? "Selecteer minstens één ticket"
              : `Inschrijven · €${(totalCents / 100).toFixed(2).replace(".", ",")}`}
      </button>
      {!isFree && (
        <p className="text-xs text-gray-sub leading-relaxed">
          Na bevestiging krijg je onze IBAN, het bedrag en een unieke mededeling. Je
          betaalt via overschrijving — plaats wordt definitief zodra de betaling binnen
          is.
        </p>
      )}
    </form>
  );
}
